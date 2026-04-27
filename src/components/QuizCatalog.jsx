import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';

import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';

import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ShareIcon from '@mui/icons-material/Share';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EditIcon from '@mui/icons-material/Edit';
import ContentDuplicateIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';

import { AuthContext } from '../context/AuthContext';

const GRAPHQL_URL = 'http://localhost:4000/';

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
    const { currentUser } = useContext(AuthContext);
    const { enqueueSnackbar } = useSnackbar();
    const navigate = useNavigate();

    const [quizzes, setQuizzes] = useState([]);
    const [search, setSearch] = useState('');
    const [scope, setScope] = useState('mine');
    const [sortBy, setSortBy] = useState('name');
    const [loading, setLoading] = useState(true);
    const [sessionsByQuizId, setSessionsByQuizId] = useState({});

    const myIdentity = useMemo(
        () => currentUser?.displayName || currentUser?.email || '',
        [currentUser]
    );

    const loadCatalog = async () => {
        setLoading(true);

        try {
            const query = `
        query GetQuizCatalog {
          getQuizCatalog {
            _id
            quizName
            createdBy
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
      `;

            const response = await fetch(GRAPHQL_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });

            const result = await response.json();

            if (!response.ok || result.errors?.length) {
                throw new Error(result?.errors?.[0]?.message || 'Could not load quizzes.');
            }

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

        let list = quizzes;

        if (scope === 'mine' && myIdentity) {
            list = list.filter(
                (quiz) => (quiz.createdBy || '').toLowerCase() === myIdentity.toLowerCase()
            );
        }

        if (q) {
            list = list.filter((quiz) => {
                const name = (quiz.quizName || '').toLowerCase();
                const creator = (quiz.createdBy || '').toLowerCase();
                const sessionCode = (sessionsByQuizId[quiz._id]?.code || '').toLowerCase();
                return name.includes(q) || creator.includes(q) || sessionCode.includes(q);
            });
        }

        const sorted = [...list];
        if (sortBy === 'name') {
            sorted.sort((a, b) => (a.quizName || '').localeCompare(b.quizName || ''));
        } else if (sortBy === 'creator') {
            sorted.sort((a, b) => (a.createdBy || '').localeCompare(b.createdBy || ''));
        } else if (sortBy === 'plays') {
            sorted.sort((a, b) => (b.timesPlayed || 0) - (a.timesPlayed || 0));
        } else if (sortBy === 'recent') {
            sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        }

        return sorted;
    }, [quizzes, search, scope, myIdentity, sortBy, sessionsByQuizId]);

    const startSession = async (quiz) => {
        try {
            const mutation = `
        mutation StartQuizSession($quizId: String!) {
          startQuizSession(quizId: $quizId) {
            code
            expiresAt
            quiz {
              _id
              quizName
              createdBy
              createdAt
            }
          }
        }
      `;

            const response = await fetch(GRAPHQL_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: mutation,
                    variables: { quizId: quiz._id }
                })
            });

            const result = await response.json();

            if (!response.ok || result.errors?.length) {
                throw new Error(result?.errors?.[0]?.message || 'Could not start session.');
            }

            const session = result.data.startQuizSession;
            setSessionsByQuizId((prev) => ({ ...prev, [quiz._id]: session }));
            enqueueSnackbar(`Session started for "${quiz.quizName}".`, { variant: 'success' });
            return session;
        } catch (error) {
            enqueueSnackbar(error.message || 'Something went wrong.', { variant: 'error' });
            return null;
        }
    };

    const ensureSession = async (quiz) => {
        const existing = sessionsByQuizId[quiz._id];
        if (existing?.code) return existing;
        return startSession(quiz);
    };

    const handleCopyCode = async (quiz) => {
        const session = await ensureSession(quiz);
        if (!session?.code) return;

        try {
            await navigator.clipboard.writeText(session.code);
            enqueueSnackbar('Quiz code copied to clipboard.', { variant: 'success' });
        } catch {
            enqueueSnackbar('Could not copy the quiz code.', { variant: 'error' });
        }
    };

    const handleNativeShare = async (quiz) => {
        const session = await ensureSession(quiz);
        if (!session?.code) return;

        const shareText = buildShareMessage(session.code, quiz.quizName);

        try {
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
        if (!session?.code) return;

        const subject = encodeURIComponent(`Join my QuizQuest quiz: ${quiz.quizName}`);
        const body = encodeURIComponent(buildShareMessage(session.code, quiz.quizName));
        window.open(`mailto:?subject=${subject}&body=${body}`, '_blank', 'noopener,noreferrer');
    };

    const handleWhatsAppShare = async (quiz) => {
        const session = await ensureSession(quiz);
        if (!session?.code) return;

        const text = encodeURIComponent(buildShareMessage(session.code, quiz.quizName));
        window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
    };

    const handleEdit = (quiz) => {
        navigate(`/create-quiz?quizId=${quiz._id}`);
    };

    const handleDuplicate = async (quiz) => {
        try {
            const mutation = `
        mutation DuplicateQuiz($quizId: String!) {
          duplicateQuiz(quizId: $quizId) {
            _id
            quizName
          }
        }
      `;

            const response = await fetch(GRAPHQL_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: mutation,
                    variables: { quizId: quiz._id }
                })
            });

            const result = await response.json();

            if (!response.ok || result.errors?.length) {
                throw new Error(result?.errors?.[0]?.message || 'Could not duplicate quiz.');
            }

            enqueueSnackbar(`Quiz duplicated as "${result.data.duplicateQuiz.quizName}".`, {
                variant: 'success'
            });
            await loadCatalog();
        } catch (error) {
            enqueueSnackbar(error.message || 'Something went wrong.', { variant: 'error' });
        }
    };

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f7f8fc' }}>
            <AppBar position="sticky">
                <Toolbar variant="dense">
                    <IconButton edge="start" color="inherit" aria-label="menu" sx={{ mr: 2 }}>
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" color="inherit" component="div">
                        Quiz Quest Catalog
                    </Typography>
                </Toolbar>
            </AppBar>

            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Stack spacing={3}>
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                            Quiz Catalog
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Browse quizzes you created, sort them, duplicate them, or start a session.
                        </Typography>
                    </Box>

                    <Card variant="outlined" sx={{ borderRadius: 3 }}>
                        <CardContent>
                            <Stack spacing={2}>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
                                    <TextField
                                        fullWidth
                                        label="Search by name, creator, or session code"
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

                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                    <Chip
                                        label="My quizzes"
                                        clickable
                                        variant={scope === 'mine' ? 'filled' : 'outlined'}
                                        color={scope === 'mine' ? 'primary' : 'default'}
                                        onClick={() => setScope('mine')}
                                    />
                                    <Chip
                                        label="All quizzes"
                                        clickable
                                        variant={scope === 'all' ? 'filled' : 'outlined'}
                                        color={scope === 'all' ? 'primary' : 'default'}
                                        onClick={() => setScope('all')}
                                    />
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
                                        <MenuItem value="plays">Times Played</MenuItem>
                                        <MenuItem value="recent">Newest</MenuItem>
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
                                                            Created by {quiz.createdBy || 'Anonymous'} • {formatDate(quiz.createdAt)}
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
                                                        onClick={() => startSession(quiz)}
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
                                                        startIcon={<ContentDuplicateIcon />}
                                                        onClick={() => handleDuplicate(quiz)}
                                                    >
                                                        Copy Quiz
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
                                                                    sx={{
                                                                        fontWeight: 800,
                                                                        letterSpacing: 2,
                                                                        wordBreak: 'break-all'
                                                                    }}
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