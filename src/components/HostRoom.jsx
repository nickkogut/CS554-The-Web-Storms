import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { gameSocket } from "../socket.js";
import { Typography, Box, Button, TableContainer, TableCell, TableHead, TableRow, TableBody, Alert, Paper, Table, FormGroup, Checkbox, FormControlLabel, Stack, Avatar, Chip, Divider } from "@mui/material";
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



  function handleNextQuestion() {
    if (roomRef.current?.status !== "review" || roomRef.current?.currentQuestionIndex == roomRef.current?.totalQuestions) return; // canNext
    setError("");
    setActionLoading(true);

    gameSocket.emit('next_question', { roomId }, (response) => {
      setActionLoading(false);

      if(!response?.ok){
        setError(response?.error || "Could not load next question");
      }
    });
  }

    function delayedHandleNextQuestion() {
      setTimeout(() => {
        if (autoNextRef.current) handleNextQuestion(); // If the user hasn't unchecked the box in the meantime, auto handle the next question
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

      {question && !finalResult ? (
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

      {room?.players?.length && !finalResult ? (
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

      {questionClosed && !finalResult ? (
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

      {room?.leaderboard?.length && !finalResult ? (
        <Paper elevation={2} sx={{ p: 3, mt: 3, fontFamily: "Gill Sans, sans-serif" }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="h5" fontWeight="bold">Leaderboard</Typography>
            <Chip label={`${room.leaderboard.length} players`} color="primary" size="small" />
          </Stack>
          <Divider sx={{ mb: 2 }} />

          <Stack spacing={1.5}>
            {room.leaderboard.map((player) => {
              const rankColor =
                player.rank === 1 ? "#FFD700" :
                player.rank === 2 ? "#C0C0C0" :
                player.rank === 3 ? "#CD7F32" : null;
              const initials = (player.name || "?").trim().split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase();

              return (
                <Paper
                  key={player.playerId}
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    borderLeft: 4,
                    borderLeftColor: rankColor || "primary.main"
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Box sx={{ minWidth: 44, textAlign: "center" }}>
                      <Typography variant="h5" fontWeight="bold" sx={{ color: rankColor || "text.primary" }}>
                        #{player.rank}
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: "primary.main" }}>
                      {initials}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight="bold" noWrap>
                        {player.name}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "right", minWidth: 70 }}>
                      <Typography variant="h6" fontWeight="bold" color="primary">
                        {player.score}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        points
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </Paper>
      ) : null}

      {finalResult ? (
        <Paper elevation={3} sx={{ p: 3, mt: 3, fontFamily: "Gill Sans, sans-serif" }}>
          {(() => {
            const board = finalResult.leaderboard || room?.leaderboard || [];
            const winner = board.find((p) => p.rank === 1) || board[0];

            return (
              <>
                <Box sx={{ textAlign: "center", mb: 3 }}>
                  <Typography variant="h2" fontWeight="bold" sx={{ mb: 1 }}>
                    🏆 Quiz Finished!
                  </Typography>
                  {winner ? (
                    <Typography variant="h6" color="text.secondary">
                      Winner: <strong style={{ color: "#FFD700" }}>{winner.name}</strong> with {winner.score} points
                    </Typography>
                  ) : null}
                </Box>

                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Typography variant="h5" fontWeight="bold">Final Standings</Typography>
                  <Chip label={`${board.length} players`} color="primary" size="small" />
                </Stack>
                <Divider sx={{ mb: 2 }} />

                <Stack spacing={1.5}>
                  {board.map((player) => {
                    const rankColor =
                      player.rank === 1 ? "#FFD700" :
                      player.rank === 2 ? "#C0C0C0" :
                      player.rank === 3 ? "#CD7F32" : null;
                    const isPodium = player.rank <= 3;
                    const initials = (player.name || "?").trim().split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase();

                    return (
                      <Paper
                        key={player.playerId}
                        variant="outlined"
                        sx={{
                          p: isPodium ? 2 : 1.5,
                          borderLeft: 4,
                          borderLeftColor: rankColor || "primary.main"
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Box sx={{ minWidth: 60, textAlign: "center" }}>
                            <Typography variant={isPodium ? "h4" : "h5"} fontWeight="bold" sx={{ color: rankColor || "text.primary" }}>
                              {player.rank === 1 ? "🥇" : player.rank === 2 ? "🥈" : player.rank === 3 ? "🥉" : `#${player.rank}`}
                            </Typography>
                          </Box>
                          <Avatar sx={{ width: isPodium ? 48 : 40, height: isPodium ? 48 : 40, bgcolor: "primary.main" }}>
                            {initials}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant={isPodium ? "h6" : "subtitle1"} fontWeight="bold" noWrap>
                              {player.name}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: "right", minWidth: 80 }}>
                            <Typography variant={isPodium ? "h5" : "h6"} fontWeight="bold" color="primary">
                              {player.score}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              points
                            </Typography>
                          </Box>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>

                <Box sx={{ mt: 3, display: "flex", justifyContent: "center", gap: 2 }}>
                  <Button variant="contained" onClick={() => navigate("/")}>
                    Back to Home
                  </Button>
                  <Button variant="outlined" onClick={goToLeaderboard}>
                    Open Full Leaderboard
                  </Button>
                </Box>
              </>
            );
          })()}
        </Paper>
      ) : null}
    </Box>
  );
}

export default HostRoom;