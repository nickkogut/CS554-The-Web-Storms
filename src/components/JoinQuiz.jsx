import { Box, Button, Stack, TextField } from "@mui/material";

import { useNavigate } from "react-router-dom";
import { useState, useContext, useEffect } from "react";
import { gameSocket } from "../socket";
import { AuthContext } from "../context/AuthContext";

function JoinQuiz(){
    const navigate = useNavigate();
    const {currentUser} = useContext(AuthContext);
    const [name, setName] = useState(currentUser?.displayName || "");
    const [pin, setPin] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    useEffect(()=>{
        if(currentUser?.displayName){
            setName(currentUser.displayName);
        }
        else{
            setName("");
        }
    },[currentUser, loading]);

    
    const handleEnter = (e)=>{
        e.preventDefault();
        if(!pin || !name) return;

        setError("");
        setLoading(true);

        gameSocket.emit('join_room', {pin, name, uid: currentUser?.uid || null}, (response)=>{
            setLoading(false);
            if(!response?.ok){
                setError(response?.error || "Could not join");
                return;
            }
            navigate(`/play/${response.roomId}?playerId=${response.playerId}`);
        });
    };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "75vh", fontFamily: "Gill Sans, sans-serif" }}      
        component="form"
        onSubmit={handleEnter}>
        <Stack spacing={2} alignItems="center" sx={{ margin: "auto", mt: 10 }}>
            <TextField
                autoFocus
                label="Name"
                variant="outlined"
                value={name}
                onChange={(e)=>setName(e.target.value)}
            ></TextField>            
            <TextField                
                label="PIN"
                variant="outlined"
                value={pin}
                onChange={(e)=>setPin(e.target.value)}
            ></TextField>
            <Button variant="contained" type="submit" disabled={!pin || !name || loading}>
                {loading ? "Joining..." : "Join Quiz"}
                </Button>
        </Stack>
    </Box>
  );
}

export default JoinQuiz;