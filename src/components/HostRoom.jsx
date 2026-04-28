import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { gameSocket } from "../../socket.js";
import { Typography, Box, Button, TableContainer, TableCell, TableHead, TableRow, TableBody, Alert, Paper, Table } from "@mui/material";

function HostRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [question, setQuestion] = useState(null);
  const [questionClosed, setQuestionClosed] = useState(null);
  const [finalResult, setFinalResult] = useState(null);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if(!gameSocket.connected){
      gameSocket.connect();
    }

    function onRoomSnapshot(snapshot){
      setRoom(snapshot);
    }

    function onQuestionStarted(payload){
      setQuestion(payload);
      setQuestionClosed(null);
      setFinalResult(null);
    }

    function onQuestionClosed(payload){
      setQuestionClosed(payload);
    }

    function onQuizFinished(payload){
      setFinalResult(payload);
      localStorage.setItem('quiz_leaderboard', JSON.stringify(payload.leaderboard));
      window.dispatchEvent(
        new CustomEvent('questionOver', { detail: payload.leaderboard })
      );
    }

    gameSocket.on('room_snapshot', onRoomSnapshot);
    gameSocket.on('question_started', onQuestionStarted);
    gameSocket.on('question_closed', onQuestionClosed);
    gameSocket.on('quiz_finished', onQuizFinished);

    gameSocket.emit('watch_room', { roomId }, (response) => {
      if(!response?.ok){
        setError(response?.error || "Could not load room");
        return;
      }

      setRoom(response.room);
    });

    return () => {
      gameSocket.off('room_snapshot', onRoomSnapshot);
      gameSocket.off('question_started', onQuestionStarted);
      gameSocket.off('question_closed', onQuestionClosed);
      gameSocket.off('quiz_finished', onQuizFinished);
    };
  }, [roomId]);

  useEffect(() => {
    const timer = setInterval(() => {
      if(!room?.questionEndsAt){
        setTimeLeft(0);
        return;
      }

      const remaining = Math.max(0, room.questionEndsAt - Date.now());
      setTimeLeft(Math.ceil(remaining / 1000));
    }, 250);

    return () => clearInterval(timer);
  }, [room]);

  const canStart = room?.status === "lobby";
  const canNext =
    room?.status === "review" &&
    room?.currentQuestionIndex < room?.totalQuestions - 1;

  const playerCount = useMemo(() => {
    return room?.players?.length || 0;
  }, [room]);

  function handleStartQuiz(){
    setError("");
    setActionLoading(true);

    gameSocket.emit('start_quiz', { roomId }, (response) => {
      setActionLoading(false);

      if(!response?.ok){
        setError(response?.error || "Could not start quiz");
      }
    });
  }

  function handleNextQuestion(){
    setError("");
    setActionLoading(true);

    gameSocket.emit('next_question', { roomId }, (response) => {
      setActionLoading(false);

      if(!response?.ok){
        setError(response?.error || "Could not load next question");
      }
    });
  }

  function goToLeaderboard(){
    navigate('/leaderboard');
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "75vh", fontFamily: "Gill Sans, sans-serif" }}>
      <Box>
        <Typography variant="h1">Host Room</Typography>

        {room ? (
          <>
            <Typography variant="body1" fontWeight="bold">PIN: {room.pin}</Typography>
            <Typography variant="body1" fontWeight="bold">Status: {room.status}</Typography>
            <Typography variant="body1" fontWeight="bold">Players Joined: {playerCount}</Typography>

            {room.status === 'question' ? (
              <Typography variant="body1" fontWeight="bold">Time Left: {timeLeft}s</Typography>
            ) : null}

            {error && <Alert severity="error">{error}</Alert>}

            {canStart ? (
              <Button
                onClick={handleStartQuiz}
                disabled={actionLoading}
                variant="contained"
              >
                {actionLoading ? 'Starting...' : 'Start Quiz'}
              </Button>
            ) : null}

            {canNext ? (
              <Button
                variant="contained"
                onClick={handleNextQuestion}
                disabled={actionLoading}
              >
                {actionLoading ? 'Loading...' : 'Next Question'}
              </Button>
            ) : null}

            {finalResult ? (
              <Button
                variant="contained"
                onClick={goToLeaderboard}
              >
                Open Leaderboard
              </Button>
            ) : null}
          </>
        ) : (
          <Typography variant="body1">Loading room...</Typography>
        )}
      </Box>

      {question ? (
        <Box>
          <Typography variant="h2">
            Question {question.questionIndex + 1} of {question.totalQuestions}
          </Typography>
          <Typography variant="body1">{question.questionText}</Typography>

          <Box>
            {question.options.map((option, index) => (
              <Box key={index}>
                {index + 1}. {option}
              </Box>
            ))}
          </Box>
        </Box>
      ) : null}

      {room?.players?.length ? (
        <Box>
          <Typography variant="h2">Players</Typography>

          <Box>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Score</TableCell>
                    <TableCell>Connected</TableCell>
                    <TableCell>Answered</TableCell>
                  </TableRow>
                </TableHead>
              <TableBody>
                {room.players.map((player, index) => (
                  <TableRow key={player.playerId}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{player.name}</TableCell>
                    <TableCell>{player.score}</TableCell>
                    <TableCell>{player.connected ? "Yes" : "No"}</TableCell>
                    <TableCell>{player.answeredCurrentQuestion ? "Yes" : "No"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>
      ) : null}

      {questionClosed ? (
        <Box>
          <Typography variant="h2">Round Result</Typography>
          <Typography variant="body1">
            <strong>Correct Option:</strong> Option {questionClosed.correctOption + 1}
          </Typography>

          <Box>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Option</TableCell>
                    <TableCell>Votes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {questionClosed.answerStats.map((count, index) => (
                    <TableRow key={index}>
                      <TableCell>Option {index + 1}</TableCell>
                      <TableCell>{count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}

export default HostRoom;