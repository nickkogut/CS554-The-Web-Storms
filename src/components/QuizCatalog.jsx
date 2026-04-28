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

import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ShareIcon from '@mui/icons-material/Share';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';

import { AuthContext } from '../context/AuthContext';
import { gameSocket } from '../../socket.js';

const GRAPHQL_URL = 'http://localhost:4000/';

function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value); ``
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
    const [scope, setScope] = useState('mine'); // mine | all
    const [loading, setLoading] = useState(true);
    const [sessionsByQuizId, setSessionsByQuizId] = useState({});

    const myIdentity = useMemo(() => {
        return currentUser?.displayName || currentUser?.email || '';
    }, [currentUser]);

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
            questions {
              questionText
              options
              correctOption
            }
          }
        }
      `;

            const response = await fetch(GRAPHQL_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
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
                const quizName = (quiz.quizName || '').toLowerCase();
                const createdBy = (quiz.createdBy || '').toLowerCase();
                const sessionCode = (sessionsByQuizId[quiz._id]?.code || '').toLowerCase();
                return (
                    quizName.includes(q) ||
                    createdBy.includes(q) ||
                    sessionCode.includes(q)
                );
            });
        }

        return list;
    }, [quizzes, search, scope, myIdentity, sessionsByQuizId]);

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
                headers: {
                    'Content-Type': 'application/json'
                },
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

            const liveRoom = await createLiveRoom(quiz, session.code);

            const enrichedSession = liveRoom
                ? { ...session, roomId: liveRoom.roomId, pin: liveRoom.pin }
                : session;

            setSessionsByQuizId((prev) => ({
                ...prev,
                [quiz._id]: enrichedSession
            }));

            enqueueSnackbar(`Session started for "${quiz.quizName}".`, { variant: 'success' });
            return enrichedSession;
        } catch (error) {
            enqueueSnackbar(error.message || 'Something went wrong.', { variant: 'error' });
            return null;
        }
    };

    const createLiveRoom = (quiz, code) => {
        return new Promise((resolve) => {
            if (!gameSocket.connected) {
                gameSocket.connect();
            }

            const hostName = currentUser?.displayName || currentUser?.email || 'Host';

            gameSocket.emit(
                'create_room',
                {
                    hostName,
                    quizId: quiz._id,
                    code
                },
                (response) => {
                    if (!response?.ok) {
                        enqueueSnackbar(
                            response?.error || 'Could not start the live room.',
                            { variant: 'warning' }
                        );
                        resolve(null);
                        return;
                    }
                    resolve(response);
                }
            );
        });
    };

    const handleOpenHostRoom = (quiz) => {
        const session = sessionsByQuizId[quiz._id];
        if (!session?.roomId) {
            enqueueSnackbar('Start the session first to open the host room.', { variant: 'info' });
            return;
        }
        navigate(`/host-room/${session.roomId}`);
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
                            Browse quizzes you created, search by code, and start a session.
                        </Typography>
                    </Box>

                    <Card variant="outlined" sx={{ borderRadius: 3 }}>
                        <CardContent>
                            <Stack spacing={2}>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
                                    <TextField
                                        fullWidth
                                        label="Search by Quiz Name, Quiz Code or Quiz Creator"
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