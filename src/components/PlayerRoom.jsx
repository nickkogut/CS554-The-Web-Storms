import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { gameSocket } from "../socket.js";
import { TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Box, Alert, Button, Table, Paper } from "@mui/material";
import { auth } from "../firebase/FirebaseConfig";

function PlayerRoom(){
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const playerId = searchParams.get("playerId");
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [question, setQuestion] = useState(null);
  const [questionClosed, setQuestionClosed] = useState(null);
  const [finalResult, setFinalResult] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if(!playerId){
      setError("Missing player information");
      return;
    }

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
      setSelectedOption(null);
      setSubmitted(false);
      setError("");
    }

    function onQuestionClosed(payload){
      setQuestionClosed(payload);
      setSubmitted(true);
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

    gameSocket.emit('player_reconnect', { roomId, playerId }, (response) => {
      if(!response?.ok){
        setError(response?.error || "Could not reconnect to room");
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
  }, [roomId, playerId]);

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

  const me = useMemo(() => {
    return room?.players?.find((player) => player.playerId === playerId) || null;
  }, [room, playerId]);

  function submitAnswer(){
    setError("");

    if(!question){
      setError("No active question");
      return;
    }

    if(selectedOption === null){
      setError("Please choose an option");
      return;
    }

    if(submitted){
      setError("You already answered this question");
      return;
    }

    gameSocket.emit(
      'submit_answer',
      {
        roomId,
        playerId,
        questionIndex: question.questionIndex,
        selectedOption
      },
      (response) => {
        if(!response?.ok){
          setError(response?.error || "Could not submit answer");
          return;
        }

        setSubmitted(true);
      }
    );
  }

  function openLeaderboard(){
    navigate('/leaderboard');
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "75vh", fontFamily: "Gill Sans, sans-serif" }}>
      <Box>
        <Typography variant="h1">Player Room</Typography>

        {room ? (
          <>
            <Typography variant="body1" fontWeight="bold">PIN: {room.pin}</Typography>
            <Typography variant="body1" fontWeight="bold">Status: {room.status}</Typography>
            <Typography variant="body1" fontWeight="bold">Your Score: {me ? me.score : 0}</Typography>
            {room.status === 'question' ? (
              <Typography variant="body1" fontWeight="bold">Time Left: {timeLeft}s</Typography>
            ) : null}
          </>
        ) : (
          <Typography variant="body1">Connecting...</Typography>
        )}

        {error && <Alert severity="error">{error}</Alert>}
      </Box>

      {question ? (
        <Box>
          <Typography variant="h2">
            Question {question.questionIndex + 1} of {question.totalQuestions}
          </Typography>
          <Typography variant="body1">{question.questionText}</Typography>

          <Box>
            {question.options.map((option, index) => (
              <Button
                key={index}
                onClick={() => {
                  if(!submitted){
                    setSelectedOption(index);
                  }
                }}
                disabled={submitted}
              >
                {index + 1}. {option}
              </Button>
            ))}
          </Box>

          <Button
            onClick={submitAnswer}
            disabled={submitted}
            variant="contained"
          >
            {submitted ? "Answer Submitted" : "Submit Answer"}
          </Button>
        </Box>
      ) : null}

      {questionClosed ? (
        <Box>
          <Typography variant="h2">Round Result</Typography>
          <Typography variant="body1">
            <strong>Correct Option:</strong> Option {questionClosed.correctOption + 1}
          </Typography>
          <Typography variant="body1">
            {selectedOption === questionClosed.correctOption
              ? "You got it right."
              : "You got it wrong."}
          </Typography>
        </Box>
      ) : null}

      {room?.leaderboard?.length ? (
        <Box>
          <Typography variant="h2">Live Leaderboard</Typography>

          <TableContainer>
            <Table>
              <TableHead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th>Score</th>
                </tr>
              </TableHead>
              <TableBody>
                {room.leaderboard.map((player) => (
                  <TableRow key={player.playerId}>
                    <TableCell>{player.rank}</TableCell>
                    <TableCell>{player.name}</TableCell>
                    <TableCell>{player.score}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ) : null}

      {finalResult ? (
        <Box>
          <Typography variant="h2">Quiz Finished</Typography>
          <Button
            onClick={openLeaderboard}
          >
            Open Final Leaderboard
          </Button>
        </Box>
      ) : null}
    </Box>
  );
}

export default PlayerRoom;