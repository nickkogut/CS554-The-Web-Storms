import React, { useContext, useState } from 'react';
import { Link as RouterLink, Navigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Divider,
  Alert
} from '@mui/material';
import GoogleLogin from './GoogleLogin';
import { AuthContext } from '../../context/AuthContext';
import { checkEmail, checkPassword, setFBError } from './authHelpers.js';
import { loginEmail, resetPassword } from '../../firebase/FirebaseFunctions';
import './auth.css';

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
    <Box className="auth-page">
      <Box className="auth-container">
        <Paper className="auth-card" elevation={3}>
          <Box className="auth-header">
            <Typography variant="h2" fontWeight="bold">
              🔐 Login
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sign in to keep playing QuizQuest
            </Typography>
          </Box>

          <Divider className="auth-divider-spaced" />

          <Box component="form" onSubmit={handleLogin} noValidate>
            <Box className="auth-form-fields">
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

              <Box className="auth-button-row">
                <Button type="button" variant="outlined" onClick={handleResetPassword}>
                  Forgot Password
                </Button>
                <Button component={RouterLink} to="/signup" variant="outlined">
                  Create Account
                </Button>
              </Box>

              <Divider>or</Divider>

              <Box className="auth-google-row">
                <GoogleLogin setError={setError} />
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}

export default Login;
