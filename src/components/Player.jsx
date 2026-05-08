import React, { useEffect, useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import { useParams } from "react-router-dom";
import userAPI from "./users/userAPI";

export default function Player() {
    const { id } = useParams();
    const [user, setUser] = useState(null);
    const [games, setGames] = useState([]);

    useEffect(() => {
        if (!id) return;

        setUser(null);
        setGames([]);

        const fetchData = async () => {
            try {
                const result = await userAPI.getUserById(id);
                setUser(result?.data?.getUserById || null);

                const gresult = await userAPI.getGamesByUserId(id);
                setGames(gresult?.data?.getGamesUserById || []);
            } catch (e) {
                console.log(e);
                alert("Failed to fetch");
            }
        };

        fetchData();
    }, [id]);

    const recentGames = useMemo(() => {
        return Array.isArray(games) ? games.slice(-5).reverse() : [];
    }, [games]);

    return (
        <Box>
            <Typography variant="h3">Player: {user?.name}</Typography>
            <Typography variant="h6">Recent Games:</Typography>

            {recentGames.length === 0 ? (
                <Typography color="text.secondary">No recent games found.</Typography>
            ) : (
                recentGames.map((game, index) => {
                    const playerEntry =
                        game.leaderboard?.find(
                            (p) =>
                                p.uid === id ||
                                p.playerId === id ||
                                p.name?.toLowerCase() === user?.name?.toLowerCase()
                        ) || null;

                    return (
                        <Box key={index} sx={{ border: '1px solid grey', p: 2, mb: 1 }}>
                            <Typography>{game.quizName || "Untitled Quiz"}</Typography>

                            {playerEntry ? (
                                <>
                                    <Typography>Rank: {playerEntry.rank} of {game.numPlayers}</Typography>
                                    <Typography>Score: {playerEntry.score}</Typography>
                                </>
                            ) : (
                                <Typography color="text.secondary">
                                    No leaderboard entry found for this game.
                                </Typography>
                            )}

                            <Typography>
                                Finished: {new Date(game.finishedAt).toLocaleString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit",
                                })}
                            </Typography>
                        </Box>
                    );
                })
            )}
        </Box>
    );
}