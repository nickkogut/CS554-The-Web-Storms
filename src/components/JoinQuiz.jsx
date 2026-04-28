import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, Stack, TextField } from "@mui/material";

import { AuthContext } from "../context/AuthContext";
import { gameSocket } from "../../socket.js";

function JoinQuiz(){
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const defaultName = currentUser?.displayName || currentUser?.email || "";

  const [pin, setPin] = useState("");
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const enterPin = (e) => {
    if(e && e.preventDefault){
      e.preventDefault();
    }

    setError("");

    const trimmedPin = pin.trim();
    const trimmedName = name.trim();

    if(!trimmedPin){
      setError("Please enter a PIN");
      return;
    }
    if(!trimmedName){
      setError("Please enter your name");
      return;
    }

    setLoading(true);

    if(!gameSocket.connected){
      gameSocket.connect();
    }

    gameSocket.emit('join_room', {
      pin: trimmedPin.toUpperCase(),
      name: trimmedName
    }, (response) => {
      setLoading(false);

      if(!response?.ok){
        setError(response?.error || "Could not join room");
        return;
      }

      navigate(`/play-room/${response.roomId}?playerId=${encodeURIComponent(response.playerId)}`);
    });
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "75vh", fontFamily: "Gill Sans, sans-serif" }}>
        <Stack spacing={2} alignItems="center" sx={{ margin: "auto", mt: 10 }}>
            <TextField
                label="PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                variant="outlined"
                onKeyDown={(e) => e.key === "Enter" && enterPin(e)}
                disabled={loading}
            />
            <TextField
                label="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                variant="outlined"
                onKeyDown={(e) => e.key === "Enter" && enterPin(e)}
                disabled={loading}
            />
            {error ? <Alert severity="error">{error}</Alert> : null}
            <Button variant="contained" onClick={enterPin} disabled={loading}>
              {loading ? "Joining..." : "Join Quiz"}
            </Button>
        </Stack>
    </Box>
  );
}

export default JoinQuiz;
