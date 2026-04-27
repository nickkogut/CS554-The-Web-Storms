import { Link } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import Mailbox from "./Mailbox.jsx";
import LogOutButton from "./auth/LogOutButton.jsx";
import { AppBar, Toolbar, Button, Box } from "@mui/material";

function Navbar(){
  const {currentUser} = useContext(AuthContext);

  return(
    <AppBar position="static">
        <Toolbar>
            <Button component={Link} to="/" color="secondary" variant="contained" size="small">Home</Button>

            {currentUser ? 

            (
            <Box sx={{ml: "auto", display: "flex", alignItems: "center", gap: "20px"}}>
            <Mailbox/>
            <LogOutButton/>
            </Box>
            ) : 

            (
            <Button component={Link} to='/login' sx={{ ml:"auto" }} color="secondary" variant="contained" size="small">Log In</Button>
            )
            }

        </Toolbar>
    </AppBar>
  )
}
export default Navbar;