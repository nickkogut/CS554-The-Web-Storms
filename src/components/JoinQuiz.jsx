import { useNavigate } from "react-router-dom";
import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { gameSocket } from "../gameSocket";
import { Box, Button, Stack, TextField, Alert } from "@mui/material";

function JoinQuiz(){
  const {currentUser} = useContext(AuthContext);
  const [pin, setPin] = useState("");
  const [playerName, setPlayerName] = useState(
    currentUser?.displayName || ""
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function EnterPIN(e){
    e.preventDefault();
    setError("");
    const cleanedPin = pin.trim();
    const cleanedName = (playerName || currentUser?.displayName || currentUser?.email || "").trim();
    if(!cleanedPin){
        setError("Please enter a PIN");
        return;
    }
    if(!cleanedName){
        setError("Please enter a player name");
        return;
    }
    setLoading(true);
    if(!gameSocket.connected){
        gameSocket.connect();
    }
    gameSocket.emit(
        'join_room',
        {
            pin: cleanedPin,
            name: cleanedName
        },
        (response) => {
            setLoading(false);
            if(!response?.ok){
                setError(response?.error || "Could not join room");
                return;
            }
            navigate(`/play/${response.roomId}?playerId=${response.playerId}`);
        }
    );
}
  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "75vh", fontFamily: "Gill Sans, sans-serif" }}> 
        <form onSubmit={EnterPIN}>       
            <Stack spacing={2} alignItems="center" sx={{ margin: "auto", mt: 10 }}>
                <TextField onChange={(e) => setPlayerName(e.target.value)}
                    label="Player Name"
                    variant="outlined"
                    value={playerName}
                />
                <TextField onChange={(e) => setPin(e.target.value)}
                    label="PIN"
                    variant="outlined"
                    value={pin}
                />
                <Button type="submit" variant="contained" disabled={loading}>
                    {loading ? "Joining..." : "Join Quiz"}
                </Button>
                {error && <Alert severity="error">{error}</Alert>}
            </Stack>
        </form>
    </Box>

  );
}

export default JoinQuiz;