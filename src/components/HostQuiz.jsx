import { Link } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Box, AppBar, Toolbar, Button, Stack } from "@mui/material";

function HostQuiz(){
  const {currentUser} = useContext(AuthContext);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "75vh", fontFamily: "Gill Sans, sans-serif" }}>        
        <AppBar position="static">
            <Toolbar>
                {currentUser ? 

                (
                <Button component={Link} to='/signout' color="inherit">Sign Out</Button>
                ) : 

                (
                <Button component={Link} to='/login' color="inherit">Log In</Button>
                )
                }
                <Button component={Link} to="/" color="inherit">Home</Button>
            </Toolbar>
        </AppBar>
        <Stack spacing={2} alignItems="center" sx={{ margin: "auto", mt: 10 }}>
            <Button component={Link} to="/my-quizzes" variant="contained" size="large">My Quizzes</Button>
            <Button component={Link} to ="/create-quiz" variant="contained" size="large">Create Quiz</Button>
            <Button component={Link} to="/search" variant="contained" size="large">Search Quizzes</Button>
        </Stack>
    </Box>
  );
}

export default HostQuiz;