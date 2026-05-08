import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { gameSocket } from "../socket.js";
import { TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Box, Alert, Button, Table, Paper } from "@mui/material";
import { auth } from "../firebase/FirebaseConfig";
import userAPI from "./users/userAPI";

function PlayerRoom() {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const playerId = searchParams.get("playerId");
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [question, setQuestion] = useState(null);
  const [questionClosed, setQuestionClosed] = useState(null);
  const [finalResult, setFinalResult] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [error, setError] = useState("");
  const [friendIds, setFriendIds] = useState(new Set());

  useEffect(() => {
    let mounted = true;
    async function loadFriends() {
      try {
        if (!auth?.currentUser?.uid) return;
        const res = await userAPI.friend.get();
        const list = res?.data?.getFriendsForUser || [];
        if (mounted) setFriendIds(new Set(list.map(f => f._id)));
      } catch (e) {
        console.error('could not load friends', e);
      }
    }
    loadFriends();
    return () => { mounted = false; };
  }, [auth?.currentUser?.uid]);

  useEffect(() => {
    if (!playerId) {
      setError("Missing player information");
      return;
    }

    if (!gameSocket.connected) {
      gameSocket.connect();
    }

    function onRoomSnapshot(snapshot) {
      setRoom(snapshot);
    }

    function onQuestionStarted(payload) {
      setQuestion(payload);
      setQuestionClosed(null);
      setFinalResult(null);
      setSelectedOptions([]);
      setSubmitted(false);
      setError("");
    }

    function onQuestionClosed(payload) {
      setQuestionClosed(payload);
      setSubmitted(true);
    }

    function onQuizFinished(payload) {
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
      if (!response?.ok) {
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
      if (!room?.questionEndsAt) {
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

  function submitAnswer() {
    setError("");

    if (!question) {
      setError("No active question");
      return;
    }

    if (selectedOptions.length === 0) {
      setError("Please choose an option");
      return;
    }

    if (submitted) {
      setError("You already answered this question");
      return;
    }

    gameSocket.emit(
      'submit_answer',
      {
        roomId,
        playerId,
        questionIndex: question.questionIndex,
        selectedOptions
      },
      (response) => {
        if (!response?.ok) {
          setError(response?.error || "Could not submit answer");
          return;
        }

        setSubmitted(true);
      }
    );
  }

  function openLeaderboard() {
    navigate('/leaderboard');
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "75vh", fontFamily: "Gill Sans, sans-serif" }}>
      <Box>
        {room ? (
          <>
            <Typography variant="h1">{room.quizName}</Typography>
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
          <Typography variant="h3">
            Question {question.questionIndex + 1} of {question.totalQuestions}
          </Typography>
          <Typography variant="subtitle1">{question.questionText}</Typography>

          <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
            {question.options.map((option, index) => {
              const selected = selectedOptions.includes(index);

              return (
                <Button
                  key={index}
                  onClick={() => {
                    if (submitted) return;

                    if (selected) {
                      setSelectedOptions(prev =>
                        prev.filter(i => i !== index)
                      );
                    } else {
                      setSelectedOptions(prev =>
                        [...prev, index].sort((a, b) => a - b)
                      );
                    }
                  }}
                  variant={selected ? "contained" : "outlined"}
                  sx={{
                    width: "70%",
                    alignSelf: "center"
                  }}
                >
                  {index + 1}. {option}
                </Button>
              );
            })}
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
          <Typography variant="h3">Round Result</Typography>
          <Typography variant="body1">
            <strong>Correct Option:</strong> Option {questionClosed.correctOption + 1}
          </Typography>
          <Typography variant="body1">
            {questionClosed.correctOptions.every(opt =>
              selectedOptions.includes(opt)
            ) &&
              selectedOptions.length === questionClosed.correctOptions.length
              ? "You selected a correct option."
              : "You got it wrong."}
          </Typography>
        </Box>
      ) : null}

      {room?.leaderboard?.length ? (
        <Box>
          <Typography variant="h3">Leaderboard</Typography>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell align="center">#</TableCell>
                  <TableCell align="center">Player</TableCell>
                  <TableCell align="center">Score</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {room.leaderboard.map((player) => (
                  <TableRow key={player.playerId}>
                    <TableCell align="center">{player.rank}</TableCell>
                    <TableCell sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography>{player.name}</Typography>
                      </Box>
                      <Box>
                        {auth?.currentUser?.uid && player.uid && player.uid !== auth.currentUser.uid && !friendIds.has(player.uid) ? (
                          <Button size="small" variant="outlined" onClick={async () => {
                            try {
                              gameSocket.emit("sendFriendRequest", { uid: auth.currentUser.uid, friendId: player.uid });
                              setFriendIds(s => new Set([...Array.from(s), player.uid]));
                            } catch (e) {
                              console.error('friend request failed', e);
                            }
                          }}>Add Friend</Button>
                        ) : null}
                      </Box>
                    </TableCell>
                    <TableCell align="center">{player.score}</TableCell>
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