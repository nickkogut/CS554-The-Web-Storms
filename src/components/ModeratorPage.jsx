import React, { useState } from 'react';

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
import Alert from '@mui/material/Alert';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import MenuIcon from '@mui/icons-material/Menu';

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

export default function ModeratorPage({ onSend }) {
    const [questions, setQuestions] = useState([createBlankQuestion()]);
    const [status, setStatus] = useState({ type: 'info', message: '' });
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
        setStatus({ type: 'info', message: 'New question added.' });
    };

    const buttonDeleteQuestion = (questionId) => {
        setQuestions((prev) => {
            if (prev.length === 1) {
                setStatus({ type: 'info', message: 'At least one question must remain.' });
                return [createBlankQuestion()];
            }

            setStatus({ type: 'info', message: 'Question removed.' });
            return prev.filter((q) => q.id !== questionId);
        });
    };

    const validateQuestions = () => {
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

    const buttonOnSend = async () => {
        try {
            setStatus({ type: 'info', message: '' });
            validateQuestions();

            const payload = normalizeQuestions(questions);

            const mutation = `
            mutation AddQuestions($questions: [QuestionInput!]!) {
                addQuestions(questions: $questions) {
                    _id
                    questionText
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
                    query: mutation,   // 🔥 REQUIRED
                    variables: {
                        questions: payload
                    }
                })
            });

            const result = await response.json();

            // 🔴 Handle GraphQL errors
            if (result.errors) {
                throw new Error(result.errors[0].message);
            }

            setStatus({
                type: 'success',
                message: 'Questions sent successfully.'
            });

            setQuestions([createBlankQuestion()]);
        } catch (error) {
            setStatus({
                type: 'error',
                message: error.message || 'Something went wrong.'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // const buttonOnSend = async () => {
    //     try {
    //         setStatus({ type: 'info', message: '' });
    //         validateQuestions();

    //         const payload = {
    //             questions: normalizeQuestions(questions),
    //             createdAt: new Date().toISOString()
    //         };

    //         setIsSubmitting(true);

    //         if (typeof onSend === 'function') {
    //             await onSend(payload);
    //         } else {
    //             const response = await fetch(API_URL, {
    //                 method: 'POST',
    //                 headers: {
    //                     'Content-Type': 'application/json'
    //                 },
    //                 body: JSON.stringify(payload)
    //             });

    //             if (!response.ok) {
    //                 const text = await response.text();
    //                 throw new Error(text || 'Failed to send questions.');
    //             }
    //         }

    //         setStatus({
    //             type: 'success',
    //             message: 'Questions sent successfully.'
    //         });

    //         setQuestions([createBlankQuestion()]);
    //     } catch (error) {
    //         setStatus({
    //             type: 'error',
    //             message: error.message || 'Something went wrong.'
    //         });
    //     } finally {
    //         setIsSubmitting(false);
    //     }
    // };

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
                            Add questions, enter four options, choose the correct answer, and send them to the backend.
                        </Typography>
                    </Box>

                    {status.message ? (
                        <Alert severity={status.type} variant="outlined">
                            {status.message}
                        </Alert>
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
        </Box>
    );
}

// import React, { useState } from 'react';

// import AppBar from '@mui/material/AppBar';
// import Box from '@mui/material/Box';
// import TextField from '@mui/material/TextField';
// import Divider from '@mui/material/Divider';
// import Toolbar from '@mui/material/Toolbar';
// import Typography from '@mui/material/Typography';
// import IconButton from '@mui/material/IconButton';
// import Button from '@mui/material/Button';
// import Stack from '@mui/material/Stack';
// import Grid from '@mui/material/Grid';

// import AddIcon from '@mui/icons-material/Add';
// import DeleteIcon from '@mui/icons-material/Delete';
// import SendIcon from '@mui/icons-material/Send';
// import MenuIcon from '@mui/icons-material/Menu';

// export default function ModeratorPage() {

//     const buttonDeleteQuestion = (question) => {
//         alert("This question will be removed")
//         handleRemove(question.id)
//     }

//     const buttonAddQuestion = () => {

//     }

//     const buttonOnSend = () => {

//     };

//     return (
//         <div className="page">
//             <AppBar position="sticky">
//                 <Toolbar variant="dense">
//                     <IconButton edge="start" color="inherit" aria-label="menu" sx={{ mr: 2 }}>
//                         <MenuIcon />
//                     </IconButton>
//                     <Typography variant="h6" color="inherit" component="div">
//                         Photos
//                     </Typography>
//                 </Toolbar>
//             </AppBar>
//             <Box
//                 component="form"
//                 sx={{ '& .MuiTextField-root': { m: 1, width: '90ch' } }}
//                 noValidate
//                 autoComplete="off"
//             >
//                 <div>
//                     <TextField
//                         id="outlined-multiline-flexible"
//                         label="Question"
//                         multiline
//                         maxRows={4}
//                     />
//                 </div>
//             </Box>
//             <Grid container rowSpacing={1} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
//                 {/* <Grid container spacing={4}> */}
//                 <Grid size={6}>
//                     <Box
//                         component="form"
//                         sx={{ '& .MuiTextField-root': { m: 1, width: '25ch' } }}
//                         noValidate
//                         autoComplete="off"
//                     >
//                         <div>
//                             <TextField
//                                 id="outlined-multiline-flexible"
//                                 label="Option 1"
//                                 multiline
//                                 maxRows={4}
//                             />
//                         </div>
//                     </Box>
//                 </Grid>
//                 <Grid size={6}>
//                     <Box
//                         component="form"
//                         sx={{ '& .MuiTextField-root': { m: 1, width: '25ch' } }}
//                         noValidate
//                         autoComplete="off"
//                     >
//                         <div>
//                             <TextField
//                                 id="outlined-multiline-flexible"
//                                 label="Option 2"
//                                 multiline
//                                 maxRows={4}
//                             />
//                         </div>
//                     </Box>
//                 </Grid>
//                 <Grid size={6}>
//                     <Box
//                         component="form"
//                         sx={{ '& .MuiTextField-root': { m: 1, width: '25ch' } }}
//                         noValidate
//                         autoComplete="off"
//                     >
//                         <div>
//                             <TextField
//                                 id="outlined-multiline-flexible"
//                                 label="Option 3"
//                                 multiline
//                                 maxRows={4}
//                             />
//                         </div>
//                     </Box>
//                 </Grid>
//                 <Grid size={6}>
//                     <Box
//                         component="form"
//                         sx={{ '& .MuiTextField-root': { m: 1, width: '25ch' } }}
//                         noValidate
//                         autoComplete="off"
//                     >
//                         <div>
//                             <TextField
//                                 id="outlined-multiline-flexible"
//                                 label="Option 4"
//                                 multiline
//                                 maxRows={4}
//                             />
//                         </div>
//                     </Box>
//                 </Grid>
//             </Grid>
//             <Button onClick={() => buttonDeleteQuestion(question)} variant="outlined" startIcon={<DeleteIcon />}>
//                 Delete
//             </Button>
//             <Divider variant="middle" />
//             <Stack direction="row" spacing={5}>
//                 <Button onClick={() => buttonAddQuestion()} variant="outlined" startIcon={<AddIcon />}>
//                     Add Question
//                 </Button>
//                 <Button onClick={() => buttonOnSend()} variant="contained" endIcon={<SendIcon />}>
//                     Send
//                 </Button>
//             </Stack>
//         </div>
//     );
// }