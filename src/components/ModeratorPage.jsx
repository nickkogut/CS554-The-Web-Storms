import React, { useEffect, useState } from 'react';
import { useSnackbar } from 'notistack';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import { rules, validate } from '../utils/validation.js';

function createBlankQuestion() {
    return {
        id: crypto.randomUUID(),
        questionText: '',
        options: ['', '', '', ''],
        correctOptions: [0]
    };
}

function normalizeQuestions(questions) {
    return questions.map((q) => ({
        questionText: q.questionText.trim(),
        options: q.options.map((opt) => opt.trim()),
        correctOptions: q.correctOptions
    }));
}

export default function ModeratorPage() {
    const { enqueueSnackbar } = useSnackbar();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const quizId = searchParams.get('quizId');

    const [quizName, setQuizName] = useState('');
    const [questions, setQuestions] = useState([createBlankQuestion()]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loadingQuiz, setLoadingQuiz] = useState(false);

    const updateQuestionText = (questionId, value) => {
        setQuestions((prev) =>
            prev.map((q) => (q.id === questionId ? { ...q, questionText: value } : q))
        );
    };

    const updateOptionText = (questionId, optionIndex, value) => {
        setQuestions((prev) =>
            prev.map((q) =>
                q.id === questionId
                    ? {
                        ...q,
                        options: q.options.map((opt, idx) => (idx === optionIndex ? value : opt))
                    }
                    : q
            )
        );
    };

    const toggleCorrectOption = (questionId, optionIndex) => {
        setQuestions((prev) =>
            prev.map((q) => {
                if (q.id !== questionId) return q;
                const has = q.correctOptions.includes(optionIndex);
                return {
                    ...q,
                    correctOptions: has
                        ? q.correctOptions.filter((x) => x !== optionIndex)
                        : [...q.correctOptions, optionIndex].sort((a, b) => a - b)
                };
            })
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
        const nameError = validate(quizName, [rules.minLength(3), rules.maxLength(100), rules.numbers]);
        if(nameError) throw new Error(`Quiz Name: ${nameError}`);
        if (!quizName.trim()) {
            throw new Error('Quiz name cannot be empty.');
        }

        for (let i = 0; i < questions.length; i += 1) {
            const q = questions[i];
            const questionError = validate(q.questionText, [rules.minLength(5), rules.maxLength(300), rules.numbers]);
            if (questionError) throw new Error(`Question ${i + 1}: ${questionError}`);

            if (!q.questionText.trim()) {
                throw new Error(`Question ${i + 1} cannot be empty.`);
            }

            for (let j = 0; j < q.options.length; j += 1) {
                const optionError = validate(q.options[j], [rules.maxLength(150)]);
                if (optionError) throw new Error(`Option ${j + 1} in Question ${i + 1}: ${optionError}`);
                if (!q.options[j].trim()) {
                    throw new Error(`Option ${j + 1} in Question ${i + 1} cannot be empty.`);
                }
            }

            if (!Array.isArray(q.correctOptions) || q.correctOptions.length === 0) {
                throw new Error(`Select at least one correct option for Question ${i + 1}.`);
            }
        }
    };

    useEffect(() => {
        if (!quizId) return;

        const loadQuiz = async () => {
            try {
                setLoadingQuiz(true);

                const result = await authorizedRequest({
                    type: 'query',
                    query: `
            query GetQuizById($quizId: String!) {
              getQuizById(quizId: $quizId) {
                _id
                quizName
                questions {
                  questionText
                  options
                  correctOptions
                }
              }
            }
          `,
                    variables: { quizId }
                });

                const quiz = result.data?.getQuizById;
                if (!quiz) throw new Error('Quiz not found.');

                setQuizName(quiz.quizName || '');
                setQuestions(
                    (quiz.questions || []).map((q) => ({
                        id: crypto.randomUUID(),
                        questionText: q.questionText || '',
                        options: q.options || ['', '', '', ''],
                        correctOptions: Array.isArray(q.correctOptions) ? q.correctOptions : []
                    }))
                );
            } catch (error) {
                enqueueSnackbar(error.message || 'Could not load quiz.', { variant: 'error' });
            } finally {
                setLoadingQuiz(false);
            }
        };

        loadQuiz();
    }, [quizId, enqueueSnackbar]);

    const buttonOnSend = async (hostAfterSave = false) => {
        try {
            validateQuestions();

            const payload = normalizeQuestions(questions);

            const mutation = quizId
                ? `
            mutation UpdateQuiz($quizId: String!, $quiz: QuizInput!) {
                updateQuiz(quizId: $quizId, quiz: $quiz) {
                    _id
                    quizName
                }
            }
            `
                : `
            mutation CreateQuiz($quiz: QuizInput!) {
                createQuiz(quiz: $quiz) {
                    _id
                    quizName
                }
            }
            `;

            setIsSubmitting(true);

            const variables = quizId
                ? {
                    quizId,
                    quiz: {
                        quizName: quizName.trim(),
                        questions: payload
                    }
                }
                : {
                    quiz: {
                        quizName: quizName.trim(),
                        questions: payload
                    }
                };

            const result = await authorizedRequest({
                type: 'mutation',
                query: mutation,
                variables
            });

            if (result.errors?.length) {
                throw new Error(result.errors[0].message);
            }

            const savedQuiz = quizId
                ? result.data.updateQuiz
                : result.data.createQuiz;

            enqueueSnackbar(
                `Quiz "${savedQuiz.quizName}" ${quizId ? 'updated' : 'saved'
                } successfully.`,
                { variant: 'success' }
            );

            // SAVE & HOST FLOW
            if (hostAfterSave) {
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

                        quizName: quizName.trim(),

                        questions: payload.map((q) => ({
                            questionText: q.questionText,
                            options: q.options,

                            correctOption:
                                q.correctOptions.length === 1
                                    ? q.correctOptions[0]
                                    : null,

                            correctOptions: q.correctOptions
                        }))
                    },
                    (response) => {
                        if (!response?.ok) {
                            enqueueSnackbar(
                                response?.error ||
                                'Could not start live session.',
                                { variant: 'error' }
                            );
                            return;
                        }

                        navigate(`/host-room/${response.roomId}`);
                        enqueueSnackbar(
                            `Session started. Code: ${response.roomId}`,
                            { variant: 'success' }
                        );
                    }
                );

                return;
            }

            // NORMAL SAVE FLOW
            if (!quizId) {
                setQuestions([createBlankQuestion()]);
                setQuizName('');
            }

            navigate('/my-quizzes');
        } catch (error) {
            enqueueSnackbar(
                error.message || 'Something went wrong.',
                { variant: 'error' }
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loadingQuiz) {
        return <div style={{ padding: 24 }}>Loading quiz...</div>;
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f7f8fc' }}>
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Stack spacing={3}>
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                            {quizId ? 'Edit Quiz' : 'Create Quiz'}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Add a quiz name, enter four options, choose one or more correct answers, and save them to the backend.
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
                                                onChange={(e) => updateOptionText(question.id, optionIndex, e.target.value)}
                                                fullWidth
                                            />
                                        ))}
                                    </Box>

                                    <FormControl>
                                        <FormLabel>Correct options</FormLabel>
                                        <FormGroup row>
                                            {question.options.map((_, optionIndex) => (
                                                <FormControlLabel
                                                    key={optionIndex}
                                                    control={
                                                        <Checkbox
                                                            checked={question.correctOptions.includes(optionIndex)}
                                                            onChange={() => toggleCorrectOption(question.id, optionIndex)}
                                                        />
                                                    }
                                                    label={`Option ${optionIndex + 1}`}
                                                />
                                            ))}
                                        </FormGroup>
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
                            onClick={() => buttonOnSend(false)}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Saving...' : 'Save'}
                        </Button>


                        <Button
                            type="button"
                            variant="contained"
                            endIcon={<SendIcon />}
                            onClick={() => buttonOnSend(true)}
                            disabled={isSubmitting}
                        >
                            Save & Host
                        </Button>
                    </Stack>
                </Stack>
            </Container>
        </Box>
    );
}