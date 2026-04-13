import { Link } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Box, AppBar, Toolbar, Button, Stack, TextField } from "@mui/material";

function EnterPIN(e){
    e.preventDefault();
    console.log("pin entered")
}

function JoinQuiz(){
  const {currentUser} = useContext(AuthContext);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "75vh", fontFamily: "Gill Sans, sans-serif" }}>        
        <AppBar position="static">
            <Toolbar>
                {currentUser ? 

                (
                <Button component={Link} to='/signout' color="inherit" variant="contained" size="small">Sign Out</Button>
                ) : 

                (
                <Button component={Link} to='/login' color="inherit" variant="contained" size="small">Log In</Button>
                )
                }
                <Button component={Link} to="/" color="inherit" variant="contained" size="small">Home</Button>
            </Toolbar>
        </AppBar>
        <Stack spacing={2} alignItems="center" sx={{ margin: "auto", mt: 10 }}>
            <TextField onSubmit={EnterPIN}
                label="PIN"
                variant="outlined"
                onKeyDown={(e) => e.key === "Enter" && EnterPIN(e)}
            ></TextField>
            <Button variant="contained" onClick={EnterPIN}>Join Quiz</Button>
        </Stack>
    </Box>
  );
}

export default JoinQuiz;