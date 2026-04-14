import React, { useContext, useState } from 'react';
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
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import MenuIcon from '@mui/icons-material/Menu';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ShareIcon from '@mui/icons-material/Share';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

import { AuthContext } from '../context/AuthContext';

const GRAPHQL_URL = 'http://localhost:4000/';

function createBlankQuestion() {
    return {
        id: crypto.randomUUID(),
        questionText: '',
        options: ['', '', '', ''],
        correctOption: 0
    };
}

function normalizeQuestions(questions) {
    return questions.map((q) => ({
        questionText: q.questionText.trim(),
        options: q.options.map((opt) => opt.trim()),
        correctOption: q.correctOption
    }));
}

function buildShareMessage(code, quizName) {
    const origin = window.location.origin;
    return `Join my QuizQuest quiz '"${quizName}"' using code: ${code}\nOpen QuizQuest: ${origin}`;
}

export default function ModeratorPage() {
    const { currentUser } = useContext(AuthContext);
    const { enqueueSnackbar } = useSnackbar();

    const [quizName, setQuizName] = useState('');
    const [questions, setQuestions] = useState([createBlankQuestion()]);
    const [quizCode, setQuizCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const updateQuestionText = (questionId, value) => {
        setQuestions((prev) =>
            prev.map((q) =>
                q.id === questionId ? { ...q, questionText: value } : q
            )
        );
    };

    const updateOptionText = (questionId, optionIndex, value) => {
        setQuestions((prev) =>
            prev.map((q) =>
                q.id === questionId
                    ? {
                        ...q,
                        options: q.options.map((opt, idx) =>
                            idx === optionIndex ? value : opt
                        )
                    }
                    : q
            )
        );
    };

    const updateCorrectOption = (questionId, value) => {
        setQuestions((prev) =>
            prev.map((q) =>
                q.id === questionId ? { ...q, correctOption: Number(value) } : q
            )
        );
    };

    const buttonAddQuestion = () => {
        setQuestions((prev) => [...prev, createBlankQuestion()]);
        enqueueSnackbar('New question added.', { variant: 'info' });
    };

    const buttonDeleteQuestion = (questionId) => {
        setQuestions((prev) => {
            if (prev.length === 1) {
                enqueueSnackbar('At least one question must remain.', { variant: 'warning' });
                return prev;
            }

            enqueueSnackbar('Question removed.', { variant: 'info' });
            return prev.filter((q) => q.id !== questionId);
        });
    };

    const validateQuestions = () => {
        if (!quizName.trim()) {
            throw new Error('Quiz name cannot be empty.');
        }

        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];

            if (!q.questionText.trim()) {
                throw new Error(`Question ${i + 1} cannot be empty.`);
            }

            for (let j = 0; j < q.options.length; j++) {
                if (!q.options[j].trim()) {
                    throw new Error(`Option ${j + 1} in Question ${i + 1} cannot be empty.`);
                }
            }

            if (q.correctOption < 0 || q.correctOption > 3) {
                throw new Error(`Please select the correct option for Question ${i + 1}.`);
            }
        }
    };

    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(quizCode);
            enqueueSnackbar('Quiz code copied to clipboard.', { variant: 'success' });
        } catch {
            enqueueSnackbar('Could not copy the quiz code.', { variant: 'error' });
        }
    };

    const handleNativeShare = async () => {
        const shareText = buildShareMessage(quizCode, quizName);

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

    const handleEmailShare = () => {
        const subject = encodeURIComponent(`Join my QuizQuest quiz: ${quizName}`);
        const body = encodeURIComponent(buildShareMessage(quizCode, quizName));
        window.open(`mailto:?subject=${subject}&body=${body}`, '_blank', 'noopener,noreferrer');
    };

    const handleWhatsAppShare = () => {
        const text = encodeURIComponent(buildShareMessage(quizCode, quizName));
        window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
    };

    const buttonOnSend = async () => {
        try {
            validateQuestions();

            const payload = normalizeQuestions(questions);

            const mutation = `
        mutation CreateQuiz($quiz: QuizInput!) {
          createQuiz(quiz: $quiz) {
            _id
            code
            quizName
            createdBy
            createdAt
            questions {
              questionText
            }
          }
        }
      `;

            setIsSubmitting(true);

            const response = await fetch(GRAPHQL_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: mutation,
                    variables: {
                        quiz: {
                            quizName: quizName.trim(),
                            createdBy: currentUser?.displayName || currentUser?.email || 'Anonymous',
                            questions: payload
                        }
                    }
                })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result?.errors?.[0]?.message || 'Failed to send questions.');
            }

            if (result.errors?.length) {
                throw new Error(result.errors[0].message);
            }

            const newCode = result.data.createQuiz.code;
            setQuizCode(newCode);

            enqueueSnackbar(`Questions sent successfully. Quiz code: ${newCode}`, {
                variant: 'success'
            });

            setQuestions([createBlankQuestion()]);
            setQuizName('');
        } catch (error) {
            enqueueSnackbar(error.message || 'Something went wrong.', {
                variant: 'error'
            });
        } finally {
            setIsSubmitting(false);
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
                        Quiz Quest Moderator
                    </Typography>
                </Toolbar>
            </AppBar>

            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Stack spacing={3}>
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                            Create Questions
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Add a quiz name, enter four options, choose the correct answer, and send them to the backend.
                        </Typography>
                    </Box>


                    <Card variant="outlined" sx={{ borderRadius: 3 }}>
                        <CardContent>
                            <TextField
                                label="Quiz Name"
                                value={quizName}
                                onChange={(e) => setQuizName(e.target.value)}
                                fullWidth
                                required
                            />
                        </CardContent>
                    </Card>

                    {quizCode ? (
                        <Card variant="outlined" sx={{ borderRadius: 3 }}>
                            <CardContent>
                                <Stack spacing={2}>
                                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                        Quiz code
                                    </Typography>

                                    <Typography
                                        variant="h4"
                                        sx={{
                                            fontWeight: 800,
                                            letterSpacing: 2,
                                            wordBreak: 'break-all'
                                        }}
                                    >
                                        {quizCode}
                                    </Typography>

                                    <Typography variant="body2" color="text.secondary">
                                        Quiz: {quizName}
                                    </Typography>

                                    <Typography variant="body2" color="text.secondary">
                                        Share this code so players can join the quiz.
                                    </Typography>

                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap">
                                        <Button
                                            variant="outlined"
                                            startIcon={<ContentCopyIcon />}
                                            onClick={handleCopyCode}
                                        >
                                            Copy code
                                        </Button>
                                        <Button variant="outlined" startIcon={<ShareIcon />} onClick={handleNativeShare}>
                                            Share
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            startIcon={<MailOutlineIcon />}
                                            onClick={handleEmailShare}
                                        >
                                            Email
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            startIcon={<WhatsAppIcon />}
                                            onClick={handleWhatsAppShare}
                                        >
                                            WhatsApp
                                        </Button>
                                    </Stack>
                                </Stack>
                            </CardContent>
                        </Card>
                    ) : null}

                    {questions.map((question, index) => (
                        <Card key={question.id} variant="outlined" sx={{ borderRadius: 3 }}>
                            <CardContent>
                                <Stack spacing={2}>
                                    <Stack
                                        direction={{ xs: 'column', sm: 'row' }}
                                        justifyContent="space-between"
                                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                                        spacing={1}
                                    >
                                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                            Question {index + 1}
                                        </Typography>

                                        <Button
                                            type="button"
                                            color="error"
                                            variant="outlined"
                                            startIcon={<DeleteIcon />}
                                            onClick={() => buttonDeleteQuestion(question.id)}
                                        >
                                            Delete
                                        </Button>
                                    </Stack>

                                    <TextField
                                        label="Question"
                                        value={question.questionText}
                                        onChange={(e) => updateQuestionText(question.id, e.target.value)}
                                        fullWidth
                                        multiline
                                        minRows={2}
                                    />

                                    <Box
                                        sx={{
                                            display: 'grid',
                                            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                                            gap: 2
                                        }}
                                    >
                                        {question.options.map((option, optionIndex) => (
                                            <TextField
                                                key={optionIndex}
                                                label={`Option ${optionIndex + 1}`}
                                                value={option}
                                                onChange={(e) =>
                                                    updateOptionText(question.id, optionIndex, e.target.value)
                                                }
                                                fullWidth
                                            />
                                        ))}
                                    </Box>

                                    <FormControl>
                                        <FormLabel>Correct option</FormLabel>
                                        <RadioGroup
                                            row
                                            value={String(question.correctOption)}
                                            onChange={(e) => updateCorrectOption(question.id, e.target.value)}
                                        >
                                            {question.options.map((_, optionIndex) => (
                                                <FormControlLabel
                                                    key={optionIndex}
                                                    value={String(optionIndex)}
                                                    control={<Radio />}
                                                    label={`Option ${optionIndex + 1}`}
                                                />
                                            ))}
                                        </RadioGroup>
                                    </FormControl>
                                </Stack>
                            </CardContent>
                        </Card>
                    ))}

                    <Divider />

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <Button
                            type="button"
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={buttonAddQuestion}
                        >
                            Add Question
                        </Button>

                        <Button
                            type="button"
                            variant="contained"
                            endIcon={<SendIcon />}
                            onClick={buttonOnSend}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Sending...' : 'Send'}
                        </Button>
                    </Stack>
                </Stack>
            </Container>
        </Box >
    );
}