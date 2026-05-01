import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import authorizedRequest from '../../authorizedRequest.js';

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
                correctOptions
              }
            }
          }
        `
            });

            setQuizzes(Array.isArray(result.data?.getQuizCatalog) ? result.data.getQuizCatalog : []);
        } catch (error) {
            setQuizzes([]);
            enqueueSnackbar(error.message || 'Could not load quizzes.', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCatalog();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredQuizzes = useMemo(() => {
        const q = search.trim().toLowerCase();

        let list = quizzes.filter((quiz) => {
            if (!q) return true;
            const name = (quiz.quizName || '').toLowerCase();
            const creatorName = (quiz.createdByName || '').toLowerCase();
            const creatorUid = (quiz.createdByUid || '').toLowerCase();
            return name.includes(q) || creatorName.includes(q) || creatorUid.includes(q);
        });

        const sorted = [...list];
        if (sortBy === 'name') {
            sorted.sort((a, b) => (a.quizName || '').localeCompare(b.quizName || ''));
        } else if (sortBy === 'creator') {
            sorted.sort((a, b) =>
                (a.createdByName || a.createdByUid || '').localeCompare(b.createdByName || b.createdByUid || '')
            );
        } else if (sortBy === 'plays') {
            sorted.sort((a, b) => (b.timesPlayed || 0) - (a.timesPlayed || 0));
        }

        return sorted;
    }, [quizzes, search, sortBy]);

    const startSession = async (quiz) => {
        const result = await authorizedRequest({
            type: 'mutation',
            query: `
        mutation StartQuizSession($quizId: String!) {
          startQuizSession(quizId: $quizId) {
            code
            expiresAt
            quiz {
              _id
              quizName
            }
          }
        }
      `,
            variables: { quizId: quiz._id }
        });

        const session = result.data?.startQuizSession;
        if (!session) throw new Error('Could not start session.');

        setSessionsByQuizId((prev) => ({
            ...prev,
            [quiz._id]: session
        }));

        return session;
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
            enqueueSnackbar('Quiz code copied to clipboard.', { variant: 'success' });
        } catch {
            enqueueSnackbar('Could not copy the quiz code.', { variant: 'error' });
        }
    };

    const handleNativeShare = async (quiz) => {
        try {
            const session = await ensureSession(quiz);
            const shareText = buildShareMessage(session.code, quiz.quizName);

            if (navigator.share) {
                await navigator.share({
                    title: 'QuizQuest quiz',
                    text: shareText,
                    url: window.location.origin
                });
            } else {
                await navigator.clipboard.writeText(shareText);
                enqueueSnackbar('Share is not supported here. Text copied instead.', {
                    variant: 'info'
                });
            }
        } catch {
            enqueueSnackbar('Share cancelled or unavailable.', { variant: 'warning' });
        }
    };

    const handleEmailShare = async (quiz) => {
        const session = await ensureSession(quiz);
        const subject = encodeURIComponent(`Join my QuizQuest quiz: ${quiz.quizName}`);
        const body = encodeURIComponent(buildShareMessage(session.code, quiz.quizName));
        window.open(`mailto:?subject=${subject}&body=${body}`, '_blank', 'noopener,noreferrer');
    };

    const handleWhatsAppShare = async (quiz) => {
        const session = await ensureSession(quiz);
        const text = encodeURIComponent(buildShareMessage(session.code, quiz.quizName));
        window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
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

            if (result.errors?.length) {
                throw new Error(result.errors[0].message);
            }

            enqueueSnackbar(`Quiz duplicated as "${result.data.duplicateQuiz.quizName}".`, {
                variant: 'success'
            });
            await loadCatalog();
        } catch (error) {
            enqueueSnackbar(error.message || 'Something went wrong.', { variant: 'error' });
        }
    };

    const handleDelete = async (quiz) => {
        if (!window.confirm(`Delete "${quiz.quizName}"?`)) return;

        try {
            const result = await authorizedRequest({
                type: 'mutation',
                query: `
          mutation DeleteQuiz($quizId: String!) {
            deleteQuiz(quizId: $quizId)
          }
        `,
                variables: { quizId: quiz._id }
            });

            if (result.errors?.length) {
                throw new Error(result.errors[0].message);
            }

            enqueueSnackbar('Quiz deleted successfully.', { variant: 'success' });
            await loadCatalog();
        } catch (error) {
            enqueueSnackbar(error.message || 'Could not delete quiz.', { variant: 'error' });
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
                        <Typography variant="body1" color="text.secondary">
                            Browse every saved quiz, sort it, duplicate it, delete it, or start a session.
                        </Typography>
                    </Box>

                    <Card variant="outlined" sx={{ borderRadius: 3 }}>
                        <CardContent>
                            <Stack spacing={2}>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
                                    <TextField
                                        fullWidth
                                        label="Search by name or creator"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        InputProps={{
                                            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
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

                                <FormControl fullWidth size="small">
                                    <InputLabel id="sort-by-label">Sort by</InputLabel>
                                    <Select
                                        labelId="sort-by-label"
                                        label="Sort by"
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                    >
                                        <MenuItem value="name">Name</MenuItem>
                                        <MenuItem value="creator">Creator</MenuItem>
                                        <MenuItem value="plays">Times played</MenuItem>
                                    </Select>
                                </FormControl>
                            </Stack>
                        </CardContent>
                    </Card>

                    <Divider />

                    <Stack spacing={2}>
                        {loading ? (
                            <Card variant="outlined" sx={{ borderRadius: 3 }}>
                                <CardContent>
                                    <Typography variant="body1">Loading quizzes...</Typography>
                                </CardContent>
                            </Card>
                        ) : filteredQuizzes.length === 0 ? (
                            <Card variant="outlined" sx={{ borderRadius: 3 }}>
                                <CardContent>
                                    <Typography variant="body1" color="text.secondary">
                                        No quizzes found.
                                    </Typography>
                                </CardContent>
                            </Card>
                        ) : (
                            filteredQuizzes.map((quiz) => {
                                const session = sessionsByQuizId[quiz._id];

                                return (
                                    <Card key={quiz._id} variant="outlined" sx={{ borderRadius: 3 }}>
                                        <CardContent>
                                            <Stack spacing={2}>
                                                <Stack
                                                    direction={{ xs: 'column', sm: 'row' }}
                                                    justifyContent="space-between"
                                                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                                                    spacing={1}
                                                >
                                                    <Box>
                                                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                                            {quiz.quizName || 'Untitled Quiz'}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            Created by {quiz.createdByName || quiz.createdByUid || 'Anonymous'} • {formatDate(quiz.createdAt)}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            Times played: {quiz.timesPlayed || 0}
                                                        </Typography>
                                                    </Box>

                                                    <Chip
                                                        label={`${quiz.questions?.length || 0} questions`}
                                                        variant="outlined"
                                                    />
                                                </Stack>

                                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap">
                                                    <Button
                                                        variant="contained"
                                                        startIcon={<PlayArrowIcon />}
                                                        onClick={async () => {
                                                            const s = await ensureSession(quiz);
                                                            enqueueSnackbar(`Session started. Code: ${s.code}`, { variant: 'success' });
                                                        }}
                                                    >
                                                        Start Session
                                                    </Button>
                                                    <Button
                                                        variant="outlined"
                                                        startIcon={<ShareIcon />}
                                                        onClick={() => handleNativeShare(quiz)}
                                                    >
                                                        Share
                                                    </Button>
                                                    <Button
                                                        variant="outlined"
                                                        startIcon={<EditIcon />}
                                                        onClick={() => handleEdit(quiz)}
                                                    >
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        variant="outlined"
                                                        startIcon={<ContentCopyAllIcon />}
                                                        onClick={() => handleDuplicate(quiz)}
                                                    >
                                                        Copy Quiz
                                                    </Button>
                                                    <Button
                                                        color="error"
                                                        variant="outlined"
                                                        startIcon={<DeleteIcon />}
                                                        onClick={() => handleDelete(quiz)}
                                                    >
                                                        Delete Quiz
                                                    </Button>
                                                </Stack>

                                                {session?.code ? (
                                                    <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: '#fbfbfd' }}>
                                                        <CardContent>
                                                            <Stack spacing={2}>
                                                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                                                    Session Code
                                                                </Typography>

                                                                <Typography
                                                                    variant="h4"
                                                                    sx={{ fontWeight: 800, letterSpacing: 2, wordBreak: 'break-all' }}
                                                                >
                                                                    {session.code}
                                                                </Typography>

                                                                <Typography variant="body2" color="text.secondary">
                                                                    Expires at: {formatDate(session.expiresAt)}
                                                                </Typography>

                                                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap">
                                                                    <Button
                                                                        variant="outlined"
                                                                        startIcon={<ContentCopyIcon />}
                                                                        onClick={() => handleCopyCode(quiz)}
                                                                    >
                                                                        Copy code
                                                                    </Button>
                                                                    <Button
                                                                        variant="outlined"
                                                                        startIcon={<ShareIcon />}
                                                                        onClick={() => handleNativeShare(quiz)}
                                                                    >
                                                                        Share
                                                                    </Button>
                                                                    <Button
                                                                        variant="outlined"
                                                                        startIcon={<MailOutlineIcon />}
                                                                        onClick={() => handleEmailShare(quiz)}
                                                                    >
                                                                        Email
                                                                    </Button>
                                                                    <Button
                                                                        variant="outlined"
                                                                        startIcon={<WhatsAppIcon />}
                                                                        onClick={() => handleWhatsAppShare(quiz)}
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