import { Box, Button, Stack, TextField } from "@mui/material";
import Navbar from "./Navbar";

function EnterPIN(e){
    e.preventDefault();
    console.log("pin entered")
}

function JoinQuiz(){

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "75vh", fontFamily: "Gill Sans, sans-serif" }}>        
        <Navbar/>
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