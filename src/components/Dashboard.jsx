import { Link } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Box, AppBar, Toolbar, Button, Stack } from "@mui/material";

function Dashboard(){
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
            </Toolbar>
        </AppBar>

        <Stack spacing={2} alignItems="center" sx={{ margin: "auto", mt: 10 }}>
            <Button color="inherit" component={Link} to="/join" variant="contained" size="large">Join Quiz</Button>
            <Button color="inherit" component={Link} to ="/host" variant="contained" size="large">Host Quiz</Button>
        </Stack>
    </Box>
  );
}

export default Dashboard;