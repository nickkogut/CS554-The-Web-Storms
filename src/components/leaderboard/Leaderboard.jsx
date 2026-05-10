import React, { useEffect, useState, useRef } from 'react';
import './leaderboard.css';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Avatar,
  Chip,
  Divider,
  Button
} from '@mui/material';
import { auth } from '../../firebase/FirebaseConfig';
import userAPI from '../users/userAPI';
import { gameSocket } from '../../socket.js';

// Key used by the game's code to write/read leaderboard data.
const STORAGE_KEY = 'quiz_leaderboard';

const SAMPLE = [
  { id: 1, name: 'Alice', score: 120 },
  { id: 2, name: 'Bob', score: 90 },
  { id: 3, name: 'Carol', score: 75 },
  { id: 4, name: 'Dan', score: 65 },
  { id: 5, name: 'Eve', score: 50 },
  { id: 6, name: 'Frank', score: 40 }
];

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getRankColor(rank) {
  if (rank === 1) return '#FFD700';
  if (rank === 2) return '#C0C0C0';
  if (rank === 3) return '#CD7F32';
  return null;
}

export default function Leaderboard() {
  const [entries, setEntries] = useState([]);
  const [friendIds, setFriendIds] = useState(new Set());
  const lastRawRef = useRef(null);

  function readStored() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    if (raw === lastRawRef.current) return null;
    lastRawRef.current = raw;
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.slice().sort((a, b) => b.score - a.score);
    } catch (e) {
      return [];
    }
  }

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const sorted = Array.isArray(parsed) ? parsed.slice().sort((a, b) => b.score - a.score) : [];
        setEntries(sorted.slice(0, 5));
        lastRawRef.current = raw;
      } catch (e) {
        setEntries([]);
      }
    } else {
      setEntries(SAMPLE.slice(0, 5));
    }

    function onStorage(e) {
      if (e.key !== STORAGE_KEY) return;
      const updated = readStored();
      if (updated) setEntries(updated.slice(0, 5));
    }
    window.addEventListener('storage', onStorage);

    function onQuestionOver(e) {
      const detail = e?.detail;
      if (Array.isArray(detail)) {
        lastRawRef.current = JSON.stringify(detail);
        const sorted = detail.slice().sort((a, b) => b.score - a.score);
        setEntries(sorted.slice(0, 5));
        return;
      }
      const updated = readStored();
      if (updated) setEntries(updated.slice(0, 5));
    }
    window.addEventListener('questionOver', onQuestionOver);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('questionOver', onQuestionOver);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadFriends() {
      try {
        if (!auth?.currentUser?.uid) return;
        const res = await userAPI.friend.get();
        const list = res?.data?.getFriendsForUser || [];
        if (mounted) setFriendIds(new Set(list.map((f) => f._id || f.uid || f.id)));
      } catch (e) {
        console.error('could not load friends', e);
      }
    }
    loadFriends();
    return () => { mounted = false; };
  }, [auth?.currentUser?.uid]);

  const winner = entries[0] || null;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, fontFamily: 'Gill Sans, sans-serif' }}>
      <Box sx={{ maxWidth: 800, mx: 'auto' }}>
        <Paper elevation={3} sx={{ p: 3 }}>
          {/* Header banner */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h2" fontWeight="bold" sx={{ mb: 1 }}>
              🏆 Leaderboard
            </Typography>
            {winner ? (
              <Typography variant="h6" color="text.secondary">
                Top Player: <strong style={{ color: '#FFD700' }}>{winner.name}</strong> with {winner.score} points
              </Typography>
            ) : null}
          </Box>

          {entries.length === 0 ? (
            <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
              No scores yet.
            </Typography>
          ) : (
            <>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="h5" fontWeight="bold">Final Standings</Typography>
                <Chip label={`${entries.length} players`} color="primary" size="small" />
              </Stack>
              <Divider sx={{ mb: 2 }} />

              <Stack spacing={1.5}>
                {entries.map((entry, idx) => {
                  const rank = idx + 1;
                  const rankColor = getRankColor(rank);
                  const isPodium = rank <= 3;
                  const isMe = auth?.currentUser?.uid && (entry.uid === auth.currentUser.uid);
                  const friendId = entry.uid || entry.id;
                  const showAddFriend = auth?.currentUser?.uid &&
                    friendId &&
                    friendId !== auth.currentUser.uid &&
                    !friendIds.has(friendId);
                  const initials = getInitials(entry.name);

                  return (
                    <Paper
                      key={entry.id ?? entry.uid ?? idx}
                      variant="outlined"
                      sx={{
                        p: isPodium ? 2 : 1.5,
                        borderLeft: 4,
                        borderLeftColor: isMe ? 'success.main' : (rankColor || 'primary.main'),
                        backgroundColor: isMe ? 'action.hover' : 'background.paper'
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Box sx={{ minWidth: 60, textAlign: 'center' }}>
                          <Typography
                            variant={isPodium ? 'h4' : 'h5'}
                            fontWeight="bold"
                            sx={{ color: rankColor || 'text.primary' }}
                          >
                            {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                          </Typography>
                        </Box>
                        <Avatar
                          sx={{
                            width: isPodium ? 48 : 40,
                            height: isPodium ? 48 : 40,
                            bgcolor: isMe ? 'success.main' : 'primary.main'
                          }}
                        >
                          {initials}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant={isPodium ? 'h6' : 'subtitle1'}
                            fontWeight="bold"
                            noWrap
                          >
                            {entry.name}{isMe ? ' (You)' : ''}
                          </Typography>
                          {showAddFriend && (
                            <Button
                              size="small"
                              variant="outlined"
                              sx={{ mt: 0.5 }}
                              onClick={async () => {
                                try {
                                  gameSocket.emit('sendFriendRequest', {
                                    uid: auth.currentUser.uid,
                                    friendId
                                  });
                                  setFriendIds((s) => new Set([...Array.from(s), friendId]));
                                } catch (err) {
                                  console.error('friend request failed', err);
                                }
                              }}
                            >
                              Add Friend
                            </Button>
                          )}
                        </Box>
                        <Box sx={{ textAlign: 'right', minWidth: 80 }}>
                          <Typography
                            variant={isPodium ? 'h5' : 'h6'}
                            fontWeight="bold"
                            color="primary"
                          >
                            {entry.score}
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
            </>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
