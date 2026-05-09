import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { gameSocket } from "../socket.js";
import { Typography, Box, Button, TableContainer, TableCell, TableHead, TableRow, TableBody, Alert, Paper, Table, FormGroup, Checkbox, FormControlLabel } from "@mui/material";
import { auth } from "../firebase/FirebaseConfig";
import WaitingRoom from "./WaitingRoom.jsx";

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
  const [autoNext, setAutoNext] = useState(false);

  // These useRefs are needed to make delayedHandleNextQuestion see updated values
  const autoNextRef = useRef(autoNext);  
  const roomRef = useRef(room);

  useEffect(() => {
    autoNextRef.current = autoNext;
  }, [autoNext]);

  useEffect(() => {
    const hostedRoomId = sessionStorage.getItem('hostedRoomId');
    if (hostedRoomId !== roomId) {
        navigate('/');
    }
  }, [roomId]);
  

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  useEffect(() => {
    if(!gameSocket.connected){
      gameSocket.connect();
    }

    function onRoomSnapshot(snapshot){
      setRoom(snapshot);

      if (autoNextRef.current) {
        delayedHandleNextQuestion();
      }
    }

    function onQuestionStarted(payload){
      setQuestion(payload);
      setQuestionClosed(null);
      setFinalResult(null);
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



  function handleNextQuestion(isManuallySelected=true) {
    if (roomRef.current?.status !== "review" || roomRef.current?.currentQuestionIndex == roomRef.current?.totalQuestions) return; // canNext
    setError("");
    setActionLoading(true);

    gameSocket.emit('next_question', { roomId }, (response) => {
      setActionLoading(false);

      if(!response?.ok && isManuallySelected){
        // ignore error if we tried to automatically load the next question but the status changed during the 8 second wait.
        setError(response?.error || "Could not load next question");
      }
    });
  }

    function delayedHandleNextQuestion() {
      setTimeout(() => {
        if (autoNextRef.current) handleNextQuestion(false); // If the user hasn't unchecked the box in the meantime, auto handle the next question
      }, 8000);
  }

  function onQuestionClosed(payload) {
    setQuestionClosed(payload);
  }

  function goToLeaderboard(){
    navigate('/leaderboard');
  }

  const handleAutoNextChange = (e) => {
    setAutoNext(e.target.checked);
    if (e.target.checked) {
      delayedHandleNextQuestion();
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "75vh", fontFamily: "Gill Sans, sans-serif" }}>
      <Box>
        {room ? (
          <>
            <Typography variant="h1">Host - {room.quizName}</Typography>
            <Typography variant="body1" fontWeight="bold">PIN: {room.pin}</Typography>
            <Typography variant="body1" fontWeight="bold">Status: {room.status}</Typography>
            <Typography variant="body1" fontWeight="bold">Players Joined: {playerCount}</Typography>

            {room.status === 'question' ? (
              <Typography variant="subtitle1" fontWeight="bold">Time Left: {timeLeft}s</Typography>
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
              <>
                <Button
                  variant="contained"
                  onClick={handleNextQuestion}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Loading...' : 'Next Question'}
                </Button>
            </>
            ) : null}
            <br/>
            {(room?.currentQuestionIndex < room?.totalQuestions - 1) &&
            
            <FormControlLabel control={<Checkbox variant="contained" onChange={(e) => handleAutoNextChange(e)}/>} label="Automatically Continue (after 8s)" />
              }
            {/* Auto next button is always shown once the quiz has started so the host doesn't have to wait to leave */}


            {finalResult ? (
              <Button
                variant="contained"
                onClick={goToLeaderboard}
              >
                Open Leaderboard
              </Button>
            ) : null}
          </>
        ) : (error ? <Alert severity="error">Error: Room not found.</Alert>
          :
          <Typography variant="body1">Loading room...</Typography>
        )}
      </Box>

      {question ? (
        <Box>
          <Typography variant="h3">
            Question {question.questionIndex + 1} of {question.totalQuestions}
          </Typography>
          <Typography variant="body1">{question.questionText}</Typography>

          <Box>
            {question.options.map((option, index) => (
              <Box key={index} sx={{margin: "5px 0"}}>
                {index + 1}. {option}
              </Box>
            ))}
          </Box>
        </Box>
      ) : null}

      {room?.players?.length ? (
        <Box>
          <Typography variant="h3">Players</Typography>

          <WaitingRoom
            mode={room.status === 'question' ? 'question' : 'waiting'}
            isHost={true}
            joinedCount={room.players.length}
            questionEndTime={room.questionEndsAt}
            questionDuration={15}
            unansweredCount={room.players.filter(p => !p.answeredCurrentQuestion).length}
            players={room.players.map(p => ({
                id: p.playerId,
                name: p.name,
                answered: p.answeredCurrentQuestion
            }))}
          />
        </Box>
      ) : null}

      {questionClosed ? (
        <Box>
          <Typography variant="h3">Round Result</Typography>
          <Typography variant="body1">
            <strong>Correct Option:</strong> Option {questionClosed.correctOption + 1} - {question.options[questionClosed.correctOption]}
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
                      <TableCell>Option {index + 1} - {question.options[index]}</TableCell>
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