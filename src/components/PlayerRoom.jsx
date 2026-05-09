import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { gameSocket } from "../socket.js";
import { TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Box, Alert, Button, Table, Paper, Stack, Avatar, Chip, Divider } from "@mui/material";
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

      {question && !finalResult ? (
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

      {questionClosed && !finalResult ? (
        <Box>
          <Typography variant="h3">Round Result</Typography>
          <Typography variant="body1">
            <strong>Correct Options:</strong>{" "}
            {questionClosed.correctOptions
              .map(opt => `Option ${opt + 1}`)
              .join(", ")}
          </Typography>
          <Typography variant="body1">
            {questionClosed.correctOptions.every(opt =>
              selectedOptions.includes(opt)
            ) &&
              selectedOptions.length === questionClosed.correctOptions.length
              ? "You got it correct."
              : "You got it wrong."
            }
          </Typography>
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
              const isMe = player.playerId === playerId;
              const initials = (player.name || "?").trim().split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase();
              const showAddFriend = auth?.currentUser?.uid && player.uid &&
                player.uid !== auth.currentUser.uid && !friendIds.has(player.uid);

              return (
                <Paper
                  key={player.playerId}
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    borderLeft: 4,
                    borderLeftColor: isMe ? "success.main" : (rankColor || "primary.main"),
                    backgroundColor: isMe ? "action.hover" : "background.paper"
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Box sx={{ minWidth: 44, textAlign: "center" }}>
                      <Typography variant="h5" fontWeight="bold" sx={{ color: rankColor || "text.primary" }}>
                        #{player.rank}
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: isMe ? "success.main" : "primary.main" }}>
                      {initials}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight="bold" noWrap>
                        {player.name}{isMe ? " (You)" : ""}
                      </Typography>
                      {showAddFriend && (
                        <Button size="small" variant="outlined" sx={{ mt: 0.5 }} onClick={async () => {
                          try {
                            gameSocket.emit("sendFriendRequest", { uid: auth.currentUser.uid, friendId: player.uid });
                            setFriendIds(s => new Set([...Array.from(s), player.uid]));
                          } catch (e) {
                            console.error('friend request failed', e);
                          }
                        }}>Add Friend</Button>
                      )}
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
            const myEntry = board.find((p) => p.playerId === playerId);

            return (
              <>
                {/* Header banner */}
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

                {/* Your result card */}
                {myEntry ? (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      mb: 3,
                      borderColor: "success.main",
                      borderWidth: 2,
                      backgroundColor: "action.hover"
                    }}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-around">
                      <Box textAlign="center">
                        <Typography variant="caption" color="text.secondary">Your Position</Typography>
                        <Typography variant="h3" fontWeight="bold" sx={{ color: myEntry.rank <= 3 ? (myEntry.rank === 1 ? "#FFD700" : myEntry.rank === 2 ? "#C0C0C0" : "#CD7F32") : "primary.main" }}>
                          #{myEntry.rank}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">of {board.length}</Typography>
                      </Box>
                      <Divider orientation="vertical" flexItem />
                      <Box textAlign="center">
                        <Typography variant="caption" color="text.secondary">Final Score</Typography>
                        <Typography variant="h3" fontWeight="bold" color="primary">
                          {myEntry.score}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">points</Typography>
                      </Box>
                    </Stack>
                  </Paper>
                ) : null}

                {/* Final leaderboard */}
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
                    const isMe = player.playerId === playerId;
                    const isPodium = player.rank <= 3;
                    const initials = (player.name || "?").trim().split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase();

                    return (
                      <Paper
                        key={player.playerId}
                        variant="outlined"
                        sx={{
                          p: isPodium ? 2 : 1.5,
                          borderLeft: 4,
                          borderLeftColor: isMe ? "success.main" : (rankColor || "primary.main"),
                          backgroundColor: isMe ? "action.hover" : "background.paper"
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Box sx={{ minWidth: 60, textAlign: "center" }}>
                            <Typography variant={isPodium ? "h4" : "h5"} fontWeight="bold" sx={{ color: rankColor || "text.primary" }}>
                              {player.rank === 1 ? "🥇" : player.rank === 2 ? "🥈" : player.rank === 3 ? "🥉" : `#${player.rank}`}
                            </Typography>
                          </Box>
                          <Avatar sx={{ width: isPodium ? 48 : 40, height: isPodium ? 48 : 40, bgcolor: isMe ? "success.main" : "primary.main" }}>
                            {initials}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant={isPodium ? "h6" : "subtitle1"} fontWeight="bold" noWrap>
                              {player.name}{isMe ? " (You)" : ""}
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
                  <Button variant="outlined" onClick={openLeaderboard}>
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

export default PlayerRoom;