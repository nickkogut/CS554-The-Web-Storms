import React, { useContext, useState } from 'react';
import { Link as RouterLink, Navigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Divider,
  Alert
} from '@mui/material';
import { createNewUserByEmail } from '../../firebase/FirebaseFunctions.js';
import { AuthContext } from '../../context/AuthContext.jsx';
import GoogleLogin from './GoogleLogin.jsx';
import { checkEmail, checkPassword, checkUsername, setFBError } from './authHelpers.js';
import { checkNumber } from '../../helpers.js';
import './auth.css';

function SignUp() {
  const { currentUser } = useContext(AuthContext);
  const [error, setError] = useState('');

  const handleSignUp = async (ev) => {
    ev.preventDefault();
    setError('');
    let { username, email, password, confirmPassword, age } = ev.target.elements;
    try {
      username = checkUsername(username.value);
      email = checkEmail(email.value);
      password = checkPassword(password.value);
      confirmPassword = checkPassword(confirmPassword.value);
      age = checkNumber(age.value, 16, 120, 'age');

      if (password !== confirmPassword) throw 'Error: passwords do not match';
    } catch (e) {
      setError(e);
      return false;
    }

    try {
      await createNewUserByEmail(email, password, username);
    } catch (e) {
      setFBError(e, setError);
    }
  };

  if (currentUser) {
    return <Navigate to="/" />;
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, fontFamily: 'Gill Sans, sans-serif' }}>
      <Box sx={{ maxWidth: 520, mx: 'auto' }}>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h2" fontWeight="bold" sx={{ mb: 1 }}>
              ✨ Create Account
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Join QuizQuest to host quizzes and compete with friends
            </Typography>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Box component="form" onSubmit={handleSignUp} noValidate>
            <Stack spacing={2}>
              <TextField
                name="username"
                id="username"
                type="text"
                label="Username"
                placeholder="6-30 characters"
                fullWidth
                required
              />
              <TextField
                name="email"
                id="email"
                type="email"
                label="Email"
                placeholder="you@example.com"
                fullWidth
                required
              />
              <TextField
                name="password"
                id="password"
                type="password"
                label="Password"
                helperText="8-32 chars · 1 uppercase · 1 lowercase · 1 number · 1 special · no spaces"
                fullWidth
                required
              />
              <TextField
                name="confirmPassword"
                id="confirmPassword"
                type="password"
                label="Confirm Password"
                placeholder="Retype password"
                fullWidth
                required
              />
              <TextField
                name="age"
                type="number"
                label="Age"
                placeholder="16+"
                inputProps={{ min: 16, max: 120 }}
                fullWidth
                required
              />

              {error && <Alert severity="error">{String(error)}</Alert>}

              <Button type="submit" variant="contained" size="large" fullWidth>
                Create a New Account
              </Button>

              <Button
                component={RouterLink}
                to="/login"
                variant="outlined"
                fullWidth
              >
                Log in Instead
              </Button>

              <Divider sx={{ my: 1 }}>or</Divider>

              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <GoogleLogin setError={setError} />
              </Box>
            </Stack>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}

export default SignUp;
