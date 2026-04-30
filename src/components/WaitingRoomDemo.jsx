import React, { useState } from 'react';
import { Box, Stack, Button, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import WaitingRoom from './WaitingRoom';
import { List, ListItem, ListItemText, ListItemButton } from '@mui/material';

export default function WaitingRoomDemo(){
  const [mode, setMode] = useState('waiting');
  const [viewRole, setViewRole] = useState('user');
  const [joined, setJoined] = useState(5);
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [timeSec, setTimeSec] = useState(20);
  const [endTs, setEndTs] = useState(null);
  const [questionDuration, setQuestionDuration] = useState(null);
  const [unanswered, setUnanswered] = useState(3);

  const [players, setPlayers] = useState(() => 
    Array.from({length:5}, (_,i)=> ({id: i+1, name: `Player ${i+1}`, answered: false}))
  );

  const startQuestion = () => {
    const dur = Math.max(1, Number(timeSec) || 10);
    const ts = Date.now() + dur * 1000;
    setEndTs(ts);
    setQuestionDuration(dur);
    setMode('question');
    // reset answered flags
    setPlayers(p => p.map(x => ({...x, answered: false})));
  };

  // keep players array length in sync with joined
  React.useEffect(() => {
    setPlayers(prev => {
      const cur = prev.slice();
      if (joined > cur.length) {
        for (let i = cur.length; i < joined; i++) cur.push({id: i+1, name: `Player ${i+1}`, answered: false});
      } else if (joined < cur.length) {
        cur.splice(joined);
      }
      return cur;
    });
  }, [joined]);

  const toggleAnswered = (id) => {
    setPlayers(p => p.map(x => x.id === id ? {...x, answered: !x.answered} : x));
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

        <Stack direction="row" spacing={2} alignItems="center">
          <ToggleButtonGroup value={viewRole} exclusive onChange={(_, v) => v && setViewRole(v)}>
            <ToggleButton value="user">User View</ToggleButton>
            <ToggleButton value="host">Host View</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <Box sx={{ mt: 2 }}>
          {viewRole === 'user' ? (
            <WaitingRoom
              mode={mode}
              joinedCount={joined}
              maxPlayers={maxPlayers}
              questionEndTime={endTs}
              questionDuration={questionDuration}
              unansweredCount={players.filter(p=>!p.answered).length}
              // not using subscribe here in demo
            />
          ) : (
            <>
              <WaitingRoom
                mode={mode}
                isHost={true}
                players={players}
                joinedCount={joined}
                maxPlayers={maxPlayers}
                questionEndTime={endTs}
                questionDuration={questionDuration}
                unansweredCount={players.filter(p=>!p.answered).length}
              />
              <Typography variant="subtitle2" sx={{ mt: 1 }}>Click a name to toggle answered</Typography>
              <List>
                {players.map(p => (
                  <ListItem key={p.id} disablePadding>
                    <ListItemButton onClick={() => toggleAnswered(p.id)}>
                      <ListItemText primary={p.name} secondary={p.answered ? 'Answered' : 'Not answered'} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </Box>
      </Stack>
    </Box>
  );
}
