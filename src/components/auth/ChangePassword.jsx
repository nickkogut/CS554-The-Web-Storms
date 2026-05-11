import React, { useContext, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Divider,
  Alert
} from '@mui/material';
import { AuthContext } from '../../context/AuthContext';
import { checkPassword, setFBError } from './authHelpers.js';
import { changePassword } from '../../firebase/FirebaseFunctions';
import './auth.css';

function ChangePassword() {
  const { currentUser } = useContext(AuthContext);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleChangePassword = async (ev) => {
    ev.preventDefault();
    setError('');
    setInfo('');
    let { oldPassword, newPassword, confirmNewPassword } = ev.target.elements;
    let email = currentUser.email;
    try {
      oldPassword = checkPassword(oldPassword.value);
      newPassword = checkPassword(newPassword.value);
      confirmNewPassword = checkPassword(confirmNewPassword.value);

      if (newPassword === oldPassword) throw 'Error: new password cannot be the same as the old password';
      if (newPassword !== confirmNewPassword) throw 'Error: new passwords do not match';
    } catch (e) {
      setError(e);
      return false;
    }

    try {
      await changePassword(email, oldPassword, newPassword);
      setInfo('Password updated successfully.');
    } catch (e) {
      setFBError(e, setError);
    }
  };

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  const usingPasswordProvider = currentUser.providerData[0].providerId === 'password';

  return (
    <Box className="auth-page">
      <Box className="auth-container">
        <Paper className="auth-card" elevation={3}>
          <Box className="auth-header">
            <Typography variant="h2" fontWeight="bold">
              🔒 Change Password
            </Typography>
            {usingPasswordProvider ? (
              <Typography variant="body2" color="text.secondary">
                Keep your account secure with a fresh password
              </Typography>
            ) : null}
          </Box>

          <Divider className="auth-divider-spaced" />

          {!usingPasswordProvider ? (
            <Alert severity="info">
              You are currently signed in using {currentUser.providerData[0].providerId}.
              Please change your password there.
            </Alert>
          ) : (
            <Box component="form" onSubmit={handleChangePassword} noValidate>
              <Box className="auth-form-fields">
                <TextField
                  name="oldPassword"
                  id="oldPassword"
                  type="password"
                  label="Old Password"
                  fullWidth
                  required
                />
                <TextField
                  name="newPassword"
                  id="newPassword"
                  type="password"
                  label="New Password"
                  helperText="8-32 chars · 1 uppercase · 1 lowercase · 1 number · 1 special · no spaces"
                  fullWidth
                  required
                />
                <TextField
                  name="confirmNewPassword"
                  id="confirmNewPassword"
                  type="password"
                  label="Confirm New Password"
                  placeholder="Retype new password"
                  fullWidth
                  required
                />

                {error && <Alert severity="error">{String(error)}</Alert>}
                {info && <Alert severity="success">{info}</Alert>}

                <Button type="submit" variant="contained" size="large" fullWidth>
                  Change Password
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}

export default ChangePassword;
