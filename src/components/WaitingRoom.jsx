import React, { useEffect, useState } from "react";
import { Box, Typography, LinearProgress, Stack, Button } from "@mui/material";
import { auth } from "../firebase/FirebaseConfig";
import { gameSocket } from "../socket";
import userAPI from "./users/userAPI";
import "./waitingRoom.css";
import { useRef } from "react";
import { Alert } from "@mui/material"

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function WaitingRoom({
  mode = "waiting", // 'waiting' | 'question'
  role = 'user', 
  isHost = undefined, // boolean to indicate host view
  joinedCount = 0,
  maxPlayers = null,
  players = null, // host view: [{id,name,answered}]
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

  const hostMode = typeof isHost === 'boolean' ? isHost : (role === 'host');

  
  const visiblePlayers = (live && live.players) || players || [];
  const [friendIds, setFriendIds] = useState(new Set());

  useEffect(() => {
    let mounted = true;
    async function loadFriends(){
      try{
        if(!auth?.currentUser?.uid) return;
        const res = await userAPI.friend.get();
        const list = res?.data?.getFriendsForUser || [];
        if(mounted) setFriendIds(new Set(list.map(f => f._id || f.uid || f.id)));
      }catch(e){
        console.error('could not load friends', e);
      }
    }
    loadFriends();
    return () => { mounted = false; };
  }, [auth?.currentUser?.uid]);

  // Internal simple HostPanel rendered inline when user is host. Keeps host UI inside this component.
  function HostPanel() {
    return (
      <Box sx={{ width: 320 }}>
        <Typography variant="h6">Player Answers</Typography>
        <Box sx={{ maxHeight: 360, overflow: 'auto', mt: 1 }}>
          { (players || []).map(p => {
            const friendId = p.uid || p.playerId || p._id || p.id;
            const canAdd = auth?.currentUser?.uid && friendId && friendId !== auth.currentUser.uid && !friendIds.has(friendId);
            return (
              <Box key={p.id ?? friendId ?? JSON.stringify(p)} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <Box sx={{ width: 36, height:36, borderRadius: '50%', bgcolor: p.answered ? 'success.main' : (mode === 'question' ? 'error.main' : 'grey.400'), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>{p.name?.charAt(0) ?? '?'}</Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1">{p.name || 'Anonymous'}</Typography>
                  <Typography variant="caption">{mode === 'question' ? (p.answered ? 'Answered' : 'Not answered') : ''}</Typography>
                </Box>
                <Box>
                  {canAdd ? (
                    <Button size="small" variant="outlined" onClick={async () => {
                      try{
                        gameSocket.emit("sendFriendRequest", {uid: auth.currentUser.uid, friendId});
                        setFriendIds(s => new Set([...Array.from(s), friendId]));
                      }catch(e){
                        console.error('friend request failed', e);
                      }
                    }}>Add Friend</Button>
                  ) : null}
                </Box>
              </Box>
            );
          }) }
        </Box>
      </Box>
    );
  }

  if (displayed.joinedCount == 0) {
    return <Alert severity="error">Error: Room not found.</Alert>
  }

  return (
    <Box className="waiting-room-root">
      <Box className="waiting-room-card" sx={{ display: hostMode ? 'flex' : 'block', gap: hostMode ? 2 : 0 }}>
        {/** left/main column: user view content */}
        <Box sx={{ flex: 1 }}>
          <Stack spacing={2} alignItems="center">
            {mode === "waiting" ? (
              <>
                <Typography variant="h5">Players Joined</Typography>
                <Typography variant="h1" className="joined-count">{displayed.joinedCount}</Typography>
                {displayed.maxPlayers ? (
                  <Typography variant="subtitle1">{displayed.joinedCount} / {displayed.maxPlayers} max players</Typography>
                ) : null}
                <Typography variant="body1">Waiting for host to start the quiz...</Typography>
                {/* show all players to non-hosts while in lobby */}
                {!hostMode && mode === 'waiting' && visiblePlayers.length > 0 ? (
                  <Box sx={{ mt: 2, width: '100%' }}>
                    {visiblePlayers.map((p) => (
                      <Box key={p.playerId || p.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 32, height:32, borderRadius: '50%', bgcolor: 'grey.400', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>{p.name?.charAt(0) ?? '?'}</Box>
                          <Typography variant="body1">{p.name || 'Anonymous'}</Typography>
                        </Box>
                        <Box>
                          {auth?.currentUser?.uid && p.uid && p.uid !== auth.currentUser.uid && !friendIds.has(p.uid) ? (
                            <Button size="small" variant="outlined" onClick={async () => {
                              try{
                                // await userAPI.friend.createRequest(p.uid);
                                gameSocket.emit("sendFriendRequest", {uid: auth.currentUser.uid, friendId: p.uid});
                                setFriendIds(s => new Set([...Array.from(s), p.uid]));
                              }catch(e){
                                console.error('friend request failed', e);
                              }
                            }}>Add Friend</Button>
                          ) : null}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : null}
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

        {hostMode ? (
          <Box sx={{ minWidth: 320 }}>
            <HostPanel />
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
