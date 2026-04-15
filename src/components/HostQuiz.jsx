import { Link } from "react-router-dom";
import { Box, Button, Stack } from "@mui/material";
import Navbar from "./Navbar";

function HostQuiz(){

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "75vh", fontFamily: "Gill Sans, sans-serif" }}>        
        <Navbar/>
        <Stack spacing={2} alignItems="center" sx={{ margin: "auto", mt: 10 }}>
            <Button component={Link} to="/my-quizzes" variant="contained" size="large">My Quizzes</Button>
            <Button component={Link} to ="/create-quiz" variant="contained" size="large">Create Quiz</Button>
            <Button component={Link} to="/search" variant="contained" size="large">Search Quizzes</Button>
        </Stack>
    </Box>
  );
}

export default HostQuiz;