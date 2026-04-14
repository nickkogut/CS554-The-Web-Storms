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

import { AuthContext } from '../context/AuthContext';

const GRAPHQL_URL = 'http://localhost:4000/';

function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value); ``
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString();
}

export default function QuizCatalog() {
    const { currentUser } = useContext(AuthContext);
    const { enqueueSnackbar } = useSnackbar();
    const navigate = useNavigate();

    const [quizzes, setQuizzes] = useState([]);
    const [search, setSearch] = useState('');
    const [scope, setScope] = useState('mine'); // mine | all
    const [loading, setLoading] = useState(true);

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
            code
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
                throw new Error(result?.errors?.[0]?.message || 'Catalog is not available yet.');
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
                const code = (quiz.code || '').toLowerCase();
                const createdBy = (quiz.createdBy || '').toLowerCase();
                const quizName = (quiz.quizName || '').toLowerCase();
                return code.includes(q) || createdBy.includes(q) || quizName.includes(q);
            });
        }

        return list;
    }, [quizzes, search, scope, myIdentity]);

    const startQuiz = (quiz) => {
        navigate(`/host?code=${encodeURIComponent(quiz.code)}`);
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
                            filteredQuizzes.map((quiz) => (
                                <Card key={quiz._id || quiz.code} variant="outlined" sx={{ borderRadius: 3 }}>
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
                                                    < Typography variant="body2" color="text.secondary" >
                                                        Code: {quiz.code} • Created by {quiz.createdBy || 'Anonymous'} • {formatDate(quiz.createdAt)}
                                                    </Typography>
                                                </Box>

                                                <Chip
                                                    label={`${quiz.questions?.length || 0} questions`}
                                                    variant="outlined"
                                                />
                                            </Stack>

                                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                                <Button
                                                    variant="contained"
                                                    startIcon={<PlayArrowIcon />}
                                                    onClick={() => startQuiz(quiz)}
                                                >
                                                    Start Session
                                                </Button>
                                            </Stack>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </Stack>
                </Stack>
            </Container>
        </Box>
    );
}