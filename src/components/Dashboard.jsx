import { Link } from "react-router-dom";
import { Box, Button, Stack } from "@mui/material";
import Navbar from "./Navbar";

function Dashboard(){

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "75vh", fontFamily: "Gill Sans, sans-serif" }}>        
        <Navbar/>

        <Stack spacing={2} alignItems="center" sx={{ margin: "auto", mt: 10 }}>
            <Button color="primary" component={Link} to="/join" variant="contained" size="large">Join Quiz</Button>
            <Button color="primary" component={Link} to ="/host" variant="contained" size="large">Host Quiz</Button>
        </Stack>
    </Box>
  );
}

export default Dashboard;