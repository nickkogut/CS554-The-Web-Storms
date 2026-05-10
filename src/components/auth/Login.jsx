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
  Alert,
  Link as MuiLink
} from '@mui/material';
import GoogleLogin from './GoogleLogin';
import { AuthContext } from '../../context/AuthContext';
import { checkEmail, checkPassword, setFBError } from './authHelpers.js';
import { loginEmail, resetPassword } from '../../firebase/FirebaseFunctions';

function Login() {
  const { currentUser } = useContext(AuthContext);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleLogin = async (ev) => {
    ev.preventDefault();
    setError('');
    setInfo('');
    let { email, password } = ev.target.elements;
    try {
      email = checkEmail(email.value);
      password = checkPassword(password.value);
    } catch (e) {
      setError(e);
      return false;
    }

    try {
      await loginEmail(email, password);
    } catch (e) {
      setFBError(e, setError);
    }
  };

  const handleResetPassword = () => {
    setError('');
    setInfo('');
    let email = document.getElementById('email').value;
    email = email.trim();
    if (email) {
      try {
        resetPassword(email);
        setInfo(`Password reset email was sent to ${email}`);
      } catch (e) {
        setFBError(e, setError);
      }
    } else {
      setError('Please enter an email');
    }
  };

  if (currentUser) {
    return <Navigate to="/" />;
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, fontFamily: 'Gill Sans, sans-serif' }}>
      <Box sx={{ maxWidth: 480, mx: 'auto' }}>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h2" fontWeight="bold" sx={{ mb: 1 }}>
              🔐 Login
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sign in to keep playing QuizQuest
            </Typography>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Box component="form" onSubmit={handleLogin} noValidate>
            <Stack spacing={2}>
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
                autoComplete="off"
                fullWidth
              />

              {error && <Alert severity="error">{String(error)}</Alert>}
              {info && <Alert severity="success">{info}</Alert>}

              <Button type="submit" variant="contained" size="large" fullWidth>
                Login
              </Button>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button
                  type="button"
                  variant="outlined"
                  fullWidth
                  onClick={handleResetPassword}
                >
                  Forgot Password
                </Button>
                <Button
                  component={RouterLink}
                  to="/signup"
                  variant="outlined"
                  fullWidth
                >
                  Create Account
                </Button>
              </Stack>

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

export default Login;
