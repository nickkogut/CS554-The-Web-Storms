import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import authorizedRequest from '../../authorizedRequest.js';
import { auth } from '../firebase/FirebaseConfig';
import { gameSocket } from '../socket.js';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

import SearchIcon from '@mui/icons-material/Search';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ShareIcon from '@mui/icons-material/Share';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyAllIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';

function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString();
}

function buildShareMessage(code, quizName) {
    const origin = window.location.origin;
    return `Join my QuizQuest quiz "${quizName}" using code: ${code}\nOpen QuizQuest: ${origin}`;
}

export default function QuizCatalog() {
    const { enqueueSnackbar } = useSnackbar();
    const navigate = useNavigate();

    const [quizzes, setQuizzes] = useState([]);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [scope, setScope] = useState('all');
    const [loading, setLoading] = useState(true);
    const [sessionsByQuizId, setSessionsByQuizId] = useState({});

    const loadCatalog = async () => {
        setLoading(true);

        try {
            const result = await authorizedRequest({
                type: 'query',
                query: `
                query GetQuizCatalog {
                    getQuizCatalog {
                        _id
                        quizName
                        createdByUid
                        createdByName
                        createdAt
                        updatedAt
                        timesPlayed
                        questions {
                            questionText
                            options
                            correctOption
                            correctOptions
                        }
                    }
                }
                `
            });

            setQuizzes(
                Array.isArray(result.data?.getQuizCatalog)
                    ? result.data.getQuizCatalog
                    : []
            );
        } catch (error) {
            setQuizzes([]);
            enqueueSnackbar(error.message || 'Could not load quizzes.', {
                variant: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCatalog();
    }, []);

    const filteredQuizzes = useMemo(() => {
        const q = search.trim().toLowerCase();

        let list = quizzes.filter((quiz) => {
            const mine =
                quiz.createdByUid === auth?.currentUser?.uid ||
                (quiz.createdByName || '').toLowerCase() ===
                (auth?.currentUser?.displayName || '').toLowerCase();

            if (scope === 'mine' && !mine) return false;

            if (!q) return true;

            return (
                (quiz.quizName || '').toLowerCase().includes(q) ||
                (quiz.createdByName || '').toLowerCase().includes(q) ||
                (quiz.createdByUid || '').toLowerCase().includes(q)
            );
        });

        const sorted = [...list];

        if (sortBy === 'name') {
            sorted.sort((a, b) =>
                (a.quizName || '').localeCompare(b.quizName || '')
            );
        } else if (sortBy === 'creator') {
            sorted.sort((a, b) =>
                (a.createdByName || '').localeCompare(
                    b.createdByName || ''
                )
            );
        } else if (sortBy === 'plays') {
            sorted.sort(
                (a, b) => (b.timesPlayed || 0) - (a.timesPlayed || 0)
            );
        }

        return sorted;
    }, [quizzes, search, sortBy, scope]);

    const startSession = async (quiz) => {
        return new Promise((resolve, reject) => {
            if (!gameSocket.connected) {
                gameSocket.connect();
            }

            gameSocket.emit(
                'create_room',
                {
                    hostName:
                        auth?.currentUser?.displayName ||
                        auth?.currentUser?.email ||
                        'Host',

                    quizName: quiz.quizName,

                    questions: (quiz.questions || []).map((q) => ({
                        questionText: q.questionText,
                        options: q.options || [],
                        correctOption:
                            Number.isInteger(q.correctOption)
                                ? q.correctOption
                                : null,
                        correctOptions:
                            Array.isArray(q.correctOptions) &&
                                q.correctOptions.length > 0
                                ? q.correctOptions
                                : Number.isInteger(q.correctOption)
                                    ? [q.correctOption]
                                    : []
                    }))
                },
                async (response) => {
                    if (!response?.ok) {
                        reject(
                            new Error(
                                response?.error ||
                                'Could not start session.'
                            )
                        );
                        return;
                    }

                    const session = {
                        code: response.pin,
                        roomId: response.roomId,
                        expiresAt: null
                    };

                    setSessionsByQuizId((prev) => ({
                        ...prev,
                        [quiz._id]: session
                    }));

                    resolve(session);
                }
            );
        });
    };

    const ensureSession = async (quiz) => {
        const existing = sessionsByQuizId[quiz._id];
        if (existing?.code) return existing;
        return startSession(quiz);
    };

    const handleCopyCode = async (quiz) => {
        try {
            const session = await ensureSession(quiz);
            await navigator.clipboard.writeText(session.code);

            enqueueSnackbar('Quiz code copied to clipboard.', {
                variant: 'success'
            });
        } catch {
            enqueueSnackbar('Could not copy the quiz code.', {
                variant: 'error'
            });
        }
    };

    const handleNativeShare = async (quiz) => {
        try {
            const session = await ensureSession(quiz);

            const shareText = buildShareMessage(
                session.code,
                quiz.quizName
            );

            if (navigator.share) {
                await navigator.share({
                    title: 'QuizQuest quiz',
                    text: shareText,
                    url: window.location.origin
                });
            } else {
                await navigator.clipboard.writeText(shareText);
            }
        } catch {
            enqueueSnackbar('Share unavailable.', {
                variant: 'warning'
            });
        }
    };

    const handleEmailShare = async (quiz) => {
        const session = await ensureSession(quiz);

        const subject = encodeURIComponent(
            `Join my QuizQuest quiz: ${quiz.quizName}`
        );

        const body = encodeURIComponent(
            buildShareMessage(session.code, quiz.quizName)
        );

        window.open(
            `mailto:?subject=${subject}&body=${body}`,
            '_blank',
            'noopener,noreferrer'
        );
    };

    const handleWhatsAppShare = async (quiz) => {
        const session = await ensureSession(quiz);

        const text = encodeURIComponent(
            buildShareMessage(session.code, quiz.quizName)
        );

        window.open(
            `https://wa.me/?text=${text}`,
            '_blank',
            'noopener,noreferrer'
        );
    };

    const handleEdit = (quiz) => {
        navigate(`/create-quiz?quizId=${quiz._id}`);
    };

    const handleDuplicate = async (quiz) => {
        try {
            const result = await authorizedRequest({
                type: 'mutation',
                query: `
                mutation DuplicateQuiz($quizId: String!) {
                    duplicateQuiz(quizId: $quizId) {
                        _id
                        quizName
                    }
                }
                `,
                variables: { quizId: quiz._id }
            });

            enqueueSnackbar(
                `Quiz duplicated as "${result.data.duplicateQuiz.quizName}".`,
                { variant: 'success' }
            );

            await loadCatalog();
        } catch {
            enqueueSnackbar('Could not duplicate quiz.', {
                variant: 'error'
            });
        }
    };

    const handleDelete = async (quiz) => {
        if (!window.confirm(`Delete "${quiz.quizName}"?`)) return;

        try {
            await authorizedRequest({
                type: 'mutation',
                query: `
                mutation DeleteQuiz($quizId: String!) {
                    deleteQuiz(quizId: $quizId)
                }
                `,
                variables: { quizId: quiz._id }
            });

            enqueueSnackbar('Quiz deleted successfully.', {
                variant: 'success'
            });

            await loadCatalog();
        } catch {
            enqueueSnackbar('Could not delete quiz.', {
                variant: 'error'
            });
        }
    };

    const handleStartLiveSession = async (quiz) => {
        try {
            const session = await ensureSession(quiz);

            enqueueSnackbar(
                `Session started. Code: ${session.code}`,
                { variant: 'success' }
            );

            navigate(`/host-room/${session.roomId}`);
        } catch (error) {
            enqueueSnackbar(error.message, {
                variant: 'error'
            });
        }
    };

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f7f8fc' }}>
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Stack spacing={3}>
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                            Quiz Catalog
                        </Typography>

                        <Typography
                            variant="body1"
                            color="text.secondary"
                        >
                            Browse every saved quiz, sort it, duplicate it,
                            delete it, or start a session.
                        </Typography>
                    </Box>

                    <Card variant="outlined" sx={{ borderRadius: 3 }}>
                        <CardContent>
                            <Stack spacing={2}>
                                <Stack
                                    direction={{
                                        xs: 'column',
                                        sm: 'row'
                                    }}
                                    spacing={1}
                                    alignItems="center"
                                >
                                    <TextField
                                        fullWidth
                                        label="Search by name or creator"
                                        value={search}
                                        onChange={(e) =>
                                            setSearch(e.target.value)
                                        }
                                        InputProps={{
                                            startAdornment: (
                                                <SearchIcon
                                                    sx={{
                                                        mr: 1,
                                                        color:
                                                            'text.secondary'
                                                    }}
                                                />
                                            )
                                        }}
                                    />

                                    <Button
                                        variant="outlined"
                                        startIcon={<RefreshIcon />}
                                        onClick={loadCatalog}
                                        sx={{ whiteSpace: 'nowrap' }}
                                    >
                                        Refresh
                                    </Button>
                                </Stack>

                                <Stack direction="row" spacing={1}>
                                    <Chip
                                        label="My Quizzes"
                                        clickable
                                        variant={
                                            scope === 'mine'
                                                ? 'filled'
                                                : 'outlined'
                                        }
                                        color={
                                            scope === 'mine'
                                                ? 'primary'
                                                : 'default'
                                        }
                                        onClick={() =>
                                            setScope('mine')
                                        }
                                    />

                                    <Chip
                                        label="All Quizzes"
                                        clickable
                                        variant={
                                            scope === 'all'
                                                ? 'filled'
                                                : 'outlined'
                                        }
                                        color={
                                            scope === 'all'
                                                ? 'primary'
                                                : 'default'
                                        }
                                        onClick={() =>
                                            setScope('all')
                                        }
                                    />
                                </Stack>

                                <FormControl fullWidth size="small">
                                    <InputLabel>
                                        Sort by
                                    </InputLabel>

                                    <Select
                                        value={sortBy}
                                        label="Sort by"
                                        onChange={(e) =>
                                            setSortBy(
                                                e.target.value
                                            )
                                        }
                                    >
                                        <MenuItem value="name">
                                            Name
                                        </MenuItem>
                                        <MenuItem value="creator">
                                            Creator
                                        </MenuItem>
                                        <MenuItem value="plays">
                                            Times played
                                        </MenuItem>
                                    </Select>
                                </FormControl>
                            </Stack>
                        </CardContent>
                    </Card>

                    <Divider />

                    <Stack spacing={2}>
                        {loading ? (
                            <Card
                                variant="outlined"
                                sx={{ borderRadius: 3 }}
                            >
                                <CardContent>
                                    <Typography>
                                        Loading quizzes...
                                    </Typography>
                                </CardContent>
                            </Card>
                        ) : filteredQuizzes.length === 0 ? (
                            <Card
                                variant="outlined"
                                sx={{ borderRadius: 3 }}
                            >
                                <CardContent>
                                    <Typography color="text.secondary">
                                        No quizzes found.
                                    </Typography>
                                </CardContent>
                            </Card>
                        ) : (
                            filteredQuizzes.map((quiz) => {
                                const session =
                                    sessionsByQuizId[
                                    quiz._id
                                    ];

                                return (
                                    <Card
                                        key={quiz._id}
                                        variant="outlined"
                                        sx={{
                                            borderRadius: 3
                                        }}
                                    >
                                        <CardContent>
                                            <Stack spacing={2}>
                                                <Stack
                                                    direction={{
                                                        xs: 'column',
                                                        sm: 'row'
                                                    }}
                                                    justifyContent="space-between"
                                                    alignItems={{
                                                        xs: 'flex-start',
                                                        sm: 'center'
                                                    }}
                                                >
                                                    <Box>
                                                        <Typography
                                                            variant="h6"
                                                            sx={{
                                                                fontWeight: 700
                                                            }}
                                                        >
                                                            {
                                                                quiz.quizName
                                                            }
                                                        </Typography>

                                                        <Typography
                                                            variant="body2"
                                                            color="text.secondary"
                                                        >
                                                            Created by{' '}
                                                            {quiz.createdByName ||
                                                                quiz.createdByUid}{' '}
                                                            •{' '}
                                                            {formatDate(
                                                                quiz.createdAt
                                                            )}
                                                        </Typography>

                                                        <Typography
                                                            variant="body2"
                                                            color="text.secondary"
                                                        >
                                                            Times played:{' '}
                                                            {quiz.timesPlayed ||
                                                                0}
                                                        </Typography>
                                                    </Box>

                                                    <Chip
                                                        label={`${quiz.questions?.length || 0} questions`}
                                                        variant="outlined"
                                                    />
                                                </Stack>

                                                <Stack
                                                    direction={{
                                                        xs: 'column',
                                                        sm: 'row'
                                                    }}
                                                    spacing={1}
                                                    flexWrap="wrap"
                                                >
                                                    <Button
                                                        variant="contained"
                                                        startIcon={
                                                            <PlayArrowIcon />
                                                        }
                                                        onClick={() =>
                                                            handleStartLiveSession(
                                                                quiz
                                                            )
                                                        }
                                                    >
                                                        Start Session
                                                    </Button>

                                                    <Button
                                                        variant="outlined"
                                                        startIcon={
                                                            <ShareIcon />
                                                        }
                                                        onClick={() =>
                                                            handleNativeShare(
                                                                quiz
                                                            )
                                                        }
                                                    >
                                                        Share
                                                    </Button>

                                                    {quiz.createdByUid === auth?.currentUser?.uid && (
                                                        <Button
                                                            variant="outlined"
                                                            startIcon={<EditIcon />}
                                                            onClick={() => handleEdit(quiz)}
                                                        >
                                                            Edit
                                                        </Button>
                                                    )}

                                                    <Button
                                                        variant="outlined"
                                                        startIcon={
                                                            <ContentCopyAllIcon />
                                                        }
                                                        onClick={() =>
                                                            handleDuplicate(
                                                                quiz
                                                            )
                                                        }
                                                    >
                                                        Copy Quiz
                                                    </Button>

                                                    {quiz.createdByUid === auth?.currentUser?.uid && (
                                                        <Button
                                                            color="error"
                                                            variant="outlined"
                                                            startIcon={<DeleteIcon />}
                                                            onClick={() => handleDelete(quiz)}
                                                        >
                                                            Delete Quiz
                                                        </Button>
                                                    )}
                                                </Stack>

                                                {session?.code ? (
                                                    <Card
                                                        variant="outlined"
                                                        sx={{
                                                            borderRadius: 2,
                                                            bgcolor:
                                                                '#fbfbfd'
                                                        }}
                                                    >
                                                        <CardContent>
                                                            <Stack spacing={2}>
                                                                <Typography
                                                                    variant="subtitle1"
                                                                    sx={{
                                                                        fontWeight: 700
                                                                    }}
                                                                >
                                                                    Session Code
                                                                </Typography>

                                                                <Typography
                                                                    variant="h4"
                                                                    sx={{
                                                                        fontWeight: 800,
                                                                        letterSpacing: 2
                                                                    }}
                                                                >
                                                                    {
                                                                        session.code
                                                                    }
                                                                </Typography>

                                                                <Typography variant="body2" color="text.secondary">
                                                                    Expires at: {formatDate(session.expiresAt)}
                                                                </Typography>

                                                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap">
                                                                    <Button
                                                                        variant="contained"
                                                                        startIcon={<MeetingRoomIcon />}
                                                                        onClick={() => handleOpenHostRoom(quiz)}
                                                                        disabled={!session?.roomId}
                                                                    >
                                                                        Open Host Room
                                                                    </Button>
                                                                    <Button
                                                                        variant="outlined"
                                                                        startIcon={<ContentCopyIcon />}
                                                                        onClick={() => handleCopyCode(quiz)}
                                                                    >
                                                                        Copy Code
                                                                    </Button>

                                                                    <Button
                                                                        variant="outlined"
                                                                        startIcon={
                                                                            <MailOutlineIcon />
                                                                        }
                                                                        onClick={() =>
                                                                            handleEmailShare(
                                                                                quiz
                                                                            )
                                                                        }
                                                                    >
                                                                        Email
                                                                    </Button>

                                                                    <Button
                                                                        variant="outlined"
                                                                        startIcon={
                                                                            <WhatsAppIcon />
                                                                        }
                                                                        onClick={() =>
                                                                            handleWhatsAppShare(
                                                                                quiz
                                                                            )
                                                                        }
                                                                    >
                                                                        WhatsApp
                                                                    </Button>
                                                                </Stack>
                                                            </Stack>
                                                        </CardContent>
                                                    </Card>
                                                ) : null}
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                );
                            })
                        )}
                    </Stack>
                </Stack>
            </Container>
        </Box>
    );
}