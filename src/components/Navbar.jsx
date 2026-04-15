import { Link } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { AppBar, Toolbar, Button } from "@mui/material";

function Navbar(){
  const {currentUser} = useContext(AuthContext);

  return(
    <AppBar position="static">
        <Toolbar>
            <Button component={Link} to="/" color="secondary" variant="contained" size="small">Home</Button>

            {currentUser ? 

            (
            <Button component={Link} to='/signout' sx={{ ml:"auto" }} color="secondary" variant="contained" size="small">Sign Out</Button>
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