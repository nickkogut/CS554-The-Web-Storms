import React, { useEffect, useState, useContext } from "react";
import {
    Box,
    Typography,
    Paper,
    Avatar,
    Stack,
    Divider,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Chip
} from "@mui/material";
import { useParams } from "react-router-dom";
import userAPI from "./users/userAPI";
import { AuthContext } from "../context/AuthContext";

function formatDate(value){
    if(!value) return "";
    const d = new Date(isNaN(Number(value)) ? value : Number(value));
    if(isNaN(d.getTime())) return "";
    return d.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}

function getInitials(name){
    if(!name) return "?";
    const parts = name.trim().split(/\s+/);
    if(parts.length === 1) return parts[0].slice(0,2).toUpperCase();
    return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
}

function getRankColor(rank){
    if(rank === 1) return "#FFD700";
    if(rank === 2) return "#C0C0C0";
    if(rank === 3) return "#CD7F32";
    return null;
}

export default function Player(){
    const { id } = useParams();
    const { currentUser } = useContext(AuthContext) || {};
    const [user, setUser] = useState(null);
    const [selfFriends, setSelfFriends] = useState(null);
    const [games, setGames] = useState([]);
    const [loadingUser, setLoadingUser] = useState(true);
    const [loadingGames, setLoadingGames] = useState(true);

    const isViewingSelf = currentUser?.uid === id;

    useEffect(() => {
        let cancelled = false;

        const fetchUser = async () => {
            setLoadingUser(true);
            try {
                const result = await userAPI.getUserById(id);
                if(cancelled) return;
                setUser(result?.data?.getUserById || null);
            } catch (e) {
                if(cancelled) return;
                setUser(null);
            } finally {
                if(!cancelled) setLoadingUser(false);
            }
        };

        const fetchGames = async () => {
            setLoadingGames(true);
            try {
                const result = await userAPI.getGamesByUserId(id);
                if(cancelled) return;
                setGames(result?.data?.getGamesUserById || []);
            } catch (e) {
                if(cancelled) return;
                setGames([]);
            } finally {
                if(!cancelled) setLoadingGames(false);
            }
        };

        const fetchSelfFriends = async () => {
            if(!isViewingSelf){
                setSelfFriends(null);
                return;
            }
            try {
                const result = await userAPI.friend.get();
                if(cancelled) return;
                setSelfFriends(result?.data?.getFriendsForUser || []);
            } catch (e) {
                if(cancelled) return;
                setSelfFriends([]);
            }
        };

        fetchUser();
        fetchGames();
        fetchSelfFriends();

        return () => { cancelled = true; };
    }, [id, isViewingSelf]);

    const profile = user || (isViewingSelf && currentUser ? {
        _id: currentUser.uid,
        name: currentUser.displayName || "You",
        email: currentUser.email || "",
        friends: []
    } : null);

    const friends = (isViewingSelf && selfFriends !== null)
        ? selfFriends
        : (profile?.friends || []);
    const loadingFriends = isViewingSelf
        ? selfFriends === null
        : loadingUser;

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, fontFamily: "Gill Sans, sans-serif" }}>
            <Box
                sx={{
                    display: "flex",
                    flexDirection: { xs: "column", md: "row" },
                    gap: 3,
                    alignItems: "flex-start"
                }}
            >
                {/* LEFT: profile + friends */}
                <Box sx={{ flex: { md: "0 0 320px" }, width: "100%" }}>
                    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                        <Stack alignItems="center" spacing={1.5}>
                            <Avatar sx={{ width: 80, height: 80, fontSize: 28, bgcolor: "primary.main" }}>
                                {getInitials(profile?.name)}
                            </Avatar>
                            {loadingUser ? (
                                <Typography variant="body2">Loading profile…</Typography>
                            ) : profile ? (
                                <>
                                    <Typography variant="h5" fontWeight="bold" align="center">
                                        {profile.name || "Unnamed Player"}
                                    </Typography>
                                    {profile.email && (
                                        <Typography variant="body2" color="text.secondary" align="center">
                                            {profile.email}
                                        </Typography>
                                    )}
                                    <Chip
                                        size="small"
                                        label={`Player ID: ${profile._id?.slice(0, 10)}…`}
                                        sx={{ mt: 0.5 }}
                                    />
                                    <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                                        <Box textAlign="center">
                                            <Typography variant="h6" fontWeight="bold">{games.length}</Typography>
                                            <Typography variant="caption" color="text.secondary">Quizzes</Typography>
                                        </Box>
                                        <Divider orientation="vertical" flexItem />
                                        <Box textAlign="center">
                                            <Typography variant="h6" fontWeight="bold">{friends.length}</Typography>
                                            <Typography variant="caption" color="text.secondary">Friends</Typography>
                                        </Box>
                                    </Stack>
                                </>
                            ) : (
                                <Typography color="error" align="center">User not found</Typography>
                            )}
                        </Stack>
                    </Paper>

                    <Paper elevation={2} sx={{ p: 2 }}>
                        <Typography variant="h6" fontWeight="bold" sx={{ px: 1, pt: 1 }}>
                            Friends
                        </Typography>
                        <Divider sx={{ my: 1 }} />
                        {loadingFriends ? (
                            <Typography variant="body2" sx={{ px: 1, pb: 1 }}>Loading friends…</Typography>
                        ) : friends.length === 0 ? (
                            <Typography variant="body2" color="text.secondary" sx={{ px: 1, pb: 1 }}>
                                No friends yet.
                            </Typography>
                        ) : (
                            <List dense disablePadding sx={{ maxHeight: 360, overflowY: "auto" }}>
                                {friends.map((friend) => (
                                    <ListItem key={friend._id}>
                                        <ListItemAvatar>
                                            <Avatar sx={{ bgcolor: "secondary.main" }}>
                                                {getInitials(friend.name)}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={friend.name}
                                            secondary={friend.friendTimestamp ? `Since ${formatDate(friend.friendTimestamp)}` : null}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        )}
                    </Paper>
                </Box>

                {/* RIGHT: full quiz history */}
                <Box sx={{ flex: 1, width: "100%" }}>
                    <Paper elevation={2} sx={{ p: 3 }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                            <Typography variant="h5" fontWeight="bold">Quiz History</Typography>
                            <Chip label={`${games.length} played`} color="primary" size="small" />
                        </Stack>
                        <Divider sx={{ mb: 2 }} />

                        {loadingGames ? (
                            <Typography variant="body2">Loading quizzes…</Typography>
                        ) : games.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                                This player hasn't finished any quizzes yet.
                            </Typography>
                        ) : (
                            <Stack spacing={2}>
                                {[...games].reverse().map((game, index) => {
                                    const playerEntry = game.leaderboard?.find((p) => p.uid === id);
                                    if(!playerEntry) return null;

                                    const isWin = playerEntry.rank === 1;
                                    const rankColor = getRankColor(playerEntry.rank);

                                    return (
                                        <Paper
                                            key={game.roomId || index}
                                            variant="outlined"
                                            sx={{
                                                p: 2,
                                                borderLeft: 4,
                                                borderLeftColor: isWin ? "success.main" : "primary.main"
                                            }}
                                        >
                                            <Stack
                                                direction={{ xs: "column", sm: "row" }}
                                                spacing={2}
                                                justifyContent="space-between"
                                                alignItems={{ xs: "flex-start", sm: "center" }}
                                            >
                                                <Box>
                                                    <Typography variant="h6" fontWeight="bold">
                                                        {game.quizName || "Untitled Quiz"}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {formatDate(game.finishedAt)}
                                                    </Typography>
                                                    {game.pin && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            PIN: {game.pin}
                                                        </Typography>
                                                    )}
                                                </Box>
                                                <Stack direction="row" spacing={3} alignItems="center">
                                                    <Box textAlign="center">
                                                        <Typography variant="h5" fontWeight="bold" sx={{ color: rankColor || "text.primary" }}>
                                                            #{playerEntry.rank}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            of {game.numPlayers}
                                                        </Typography>
                                                    </Box>
                                                    <Divider orientation="vertical" flexItem />
                                                    <Box textAlign="center">
                                                        <Typography variant="h5" fontWeight="bold" color="primary">
                                                            {playerEntry.score}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            points
                                                        </Typography>
                                                    </Box>
                                                </Stack>
                                            </Stack>
                                        </Paper>
                                    );
                                })}
                            </Stack>
                        )}
                    </Paper>
                </Box>
            </Box>
        </Box>
    );
}
