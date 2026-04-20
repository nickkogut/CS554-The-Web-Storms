import React, { useState } from 'react';
import { Box, Stack, Button, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import WaitingRoom from './WaitingRoom';

export default function WaitingRoomDemo(){
  const [mode, setMode] = useState('waiting');
  const [joined, setJoined] = useState(5);
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [timeSec, setTimeSec] = useState(20);
  const [endTs, setEndTs] = useState(null);
  const [questionDuration, setQuestionDuration] = useState(null);
  const [unanswered, setUnanswered] = useState(3);

  const startQuestion = () => {
    const dur = Math.max(1, Number(timeSec) || 10);
    const ts = Date.now() + dur * 1000;
    setEndTs(ts);
    setQuestionDuration(dur);
    setMode('question');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={2} direction="row" alignItems="center">
        <Typography variant="h6">Demo Controls</Typography>
      </Stack>

      <Stack spacing={2} sx={{ mt: 2, maxWidth: 720 }}>
        <ToggleButtonGroup value={mode} exclusive onChange={(_, v) => v && setMode(v)}>
          <ToggleButton value="waiting">Waiting</ToggleButton>
          <ToggleButton value="question">Question</ToggleButton>
        </ToggleButtonGroup>

        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="outlined" onClick={() => setJoined(j => Math.max(0, j-1))}>-</Button>
          <Typography>Joined: {joined}</Typography>
          <Button variant="outlined" onClick={() => setJoined(j => j+1)}>+</Button>
        </Stack>

        <TextField label="Max players" type="number" value={maxPlayers} onChange={e => setMaxPlayers(Number(e.target.value||0))} />
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField label="Question length (sec)" type="number" value={timeSec} onChange={e => setTimeSec(Number(e.target.value||0))} />
          <Button variant="contained" onClick={startQuestion}>Start Question</Button>
        </Stack>

        <TextField label="Unanswered count" type="number" value={unanswered} onChange={e => setUnanswered(Number(e.target.value||0))} />

        <Box sx={{ mt: 2 }}>
          <WaitingRoom
            mode={mode}
            joinedCount={joined}
            maxPlayers={maxPlayers}
            questionEndTime={endTs}
            questionDuration={questionDuration}
            unansweredCount={unanswered}
          />
        </Box>
      </Stack>
    </Box>
  );
}
