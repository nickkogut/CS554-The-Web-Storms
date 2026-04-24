import { Link } from "react-router-dom";
import { Box, Button, Stack } from "@mui/material";
import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { gameSocket } from "../../socket.js";

function HostQuiz(){
  const {currentUser} = useContext(AuthContext);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const createLiveRoom = () => {
    setError("");
    setLoading(true);
    console.log('socket connected:', gameSocket.connected);
    if(!gameSocket.connected){
      gameSocket.connect();
    }
    const hostName = currentUser?.displayName || currentUser?.email || "Host";
    gameSocket.emit( 'create_room', {
      hostName,
      questionCount: 5
    }, (response) => {
      console.log('create_room response:', response);
      setLoading(false);
      if(!response?.ok){
        setError(response?.error || "Could not create room");
        return;
      }
      navigate(`/host-room/${response.roomId}`);
    }
  );
};


  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "75vh", fontFamily: "Gill Sans, sans-serif" }}>        
        <Stack spacing={2} alignItems="center" sx={{ margin: "auto", mt: 10 }}>
            <Button
              onClick={createLiveRoom}
              disabled={loading} >
                {loading ? "Creating..." : "Start Live Quiz"}
            </Button>
            <Button component={Link} to="/my-quizzes" variant="contained" size="large">My Quizzes</Button>
            <Button component={Link} to ="/create-quiz" variant="contained" size="large">Create Quiz</Button>
            <Button component={Link} to="/search" variant="contained" size="large">Search Quizzes</Button>
            <Button component={Link} to="/waiting-demo" variant="outlined" size="large">Waiting Room Demo</Button>
        </Stack>
    </Box>
  );
}

export default HostQuiz;