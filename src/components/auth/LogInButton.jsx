import React, {useContext} from 'react';
import {useNavigate} from 'react-router-dom';
import {logOut} from '../../firebase/FirebaseFunctions';
import './auth.css';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';

const LogInButton = () => {
  const navigate = useNavigate();

  const handleClick = async () => {
    navigate("/login", {replace: true});
  }

    return (
    <React.Fragment>
      <Button onClick={handleClick}>Log In</Button>
    </React.Fragment>
  );
};

export default LogInButton;