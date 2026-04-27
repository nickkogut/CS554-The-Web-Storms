import React, { useEffect, useState } from "react";
import { Box, Typography, LinearProgress, Stack } from "@mui/material";
import { auth } from "../firebase/FirebaseConfig";
import { gameSocket } from "../../socket";
import "./waitingRoom.css";

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function WaitingRoom({
  mode = "waiting", // 'waiting' | 'question'
  joinedCount = 0,
  maxPlayers = null,
  questionEndTime = null, // ISO string or ms timestamp
  questionDuration = null, // seconds (total duration of current question)
  timeLeft = null, // seconds
  unansweredCount = 0,
  subscribe = null,
}) {
  
  const [remainingMs, setRemainingMs] = useState(() => {
    if (timeLeft != null) return Math.max(0, timeLeft * 1000);
    if (questionEndTime) return Math.max(0, new Date(questionEndTime).getTime() - Date.now());
    return 0;
  });

  const [live, setLive] = useState(null); // accept live payload to override props

  useEffect(() => {
    let timer;
    if (mode === "question") {
      const computeMs = () => {
        // prefer live payload values when available
        if (live && live.timeLeft != null) return Math.max(0, live.timeLeft * 1000);
        if (live && live.questionEndTime) return Math.max(0, new Date(live.questionEndTime).getTime() - Date.now());

        if (timeLeft != null) return Math.max(0, timeLeft * 1000);
        if (questionEndTime) return Math.max(0, new Date(questionEndTime).getTime() - Date.now());
        return 0;
      };

      setRemainingMs(computeMs());
      timer = setInterval(() => setRemainingMs(computeMs()), 100);
    }

    return () => clearInterval(timer);
  }, [mode, questionEndTime, timeLeft, live]);

  useEffect(() => {
    if (typeof subscribe === 'function') {
      const unsubscribe = subscribe((payload) => {
        // payload can include joinedCount, maxPlayers, questionEndTime, timeLeft, unansweredCount, questionDuration
        setLive(payload || null);
      });


      return () => {
        try { unsubscribe && unsubscribe(); } catch (e) {}
      };
    }
  }, [subscribe]);

  // allow live payload to override incoming props
  const displayed = {
    joinedCount: live && live.joinedCount != null ? live.joinedCount : joinedCount,
    maxPlayers: live && live.maxPlayers != null ? live.maxPlayers : maxPlayers,
    unansweredCount: live && live.unansweredCount != null ? live.unansweredCount : unansweredCount,
    questionEndTime: live && live.questionEndTime != null ? live.questionEndTime : questionEndTime,
    questionDuration: live && live.questionDuration != null ? live.questionDuration : questionDuration,
  };

  //track pct of time elapsed
  let timePctElapsed = 0;
  if (mode === 'question' && displayed.questionDuration) {
    const durMs = Math.max(1, displayed.questionDuration * 1000);
    const elapsed = Math.max(0, durMs - remainingMs);
    timePctElapsed = Math.max(0, Math.min(100, (elapsed / durMs) * 100));
  }

  const pct = mode === "question" && displayed.maxPlayers ? Math.round((displayed.joinedCount / displayed.maxPlayers) * 100) : 0;

  return (
    <Box className="waiting-room-root">
      <Box className="waiting-room-card">
        <Stack spacing={2} alignItems="center">

            {/**different waiting pages based before/during quiz */}
          {mode === "waiting" ? (
            <>
              <Typography variant="h5">Players Joined</Typography>
              <Typography variant="h1" className="joined-count">{displayed.joinedCount}</Typography>
              {displayed.maxPlayers ? (
                <Typography variant="subtitle1">{displayed.joinedCount} / {displayed.maxPlayers} max players</Typography>
              ) : null}
              <Typography variant="body1">Waiting for host to start the quiz...</Typography>
            </>
          ) : (
            <>
              <Typography variant="subtitle1">{displayed.unansweredCount} / {displayed.joinedCount ?? "?"} answering</Typography>
              <Typography variant="subtitle2">Time left</Typography>
              {remainingMs <= 0 ? (
                <Typography variant="h3" className="time-left">Time's up!</Typography>
              ) : (
                <Typography variant="h3" className="time-left">{formatTime(Math.ceil(remainingMs / 1000))}</Typography>
              )}
              <Box sx={{ width: "100%", mt: 1 }}>
                <LinearProgress variant="determinate" value={timePctElapsed} />
              </Box>
            </>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
