import React, { useEffect, useState } from "react";
import { Box, Typography} from "@mui/material";
import { useParams } from "react-router-dom";
import userAPI from "./users/userAPI";

export default function Player(){
    const {id} = useParams();
    const [user, setUser] = useState(null);
    const [games, setGames] = useState([]);

    useEffect(()=>{
        const fetchUser = async ()=>{
            const result = await userAPI.getUserById(id);
            setUser(result?.data?.getUserById || null);
            if(!result){
                alert("No user found");
            }
        }
        fetchUser();

        const fetchGames = async ()=>{
            const result = await userAPI.getGamesByUserId(id);
            setGames(result?.data?.getGamesUserById || []);
        }
        fetchGames();

    },[id])

    return(
        <Box>
            <Typography variant="h3">Player: {user?.name}</Typography>
            <Typography variant="h6">Recent Games: </Typography>
            {games.slice(0, 5).map((game, index) => {
                const playerEntry = game.leaderboard.find(p => p.uid === id);
                if (!playerEntry) return null;
                return (
                    <Box key={index} sx={{ border: '1px solid grey', p: 2, mb: 1 }}>
                        <Typography> {game.quizName || "Untitled Quiz"}</Typography>
                        <Typography>Rank: {playerEntry.rank} of {game.numPlayers}</Typography>
                        <Typography>Score: {playerEntry.score}</Typography>
                        <Typography>Finished: {new Date(game.finishedAt).toLocaleString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                        })}</Typography>
                    </Box>
                );
            })}
        </Box>
    );
}
