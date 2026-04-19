import React, {useContext} from 'react';
import {useNavigate} from 'react-router-dom';
import {logOut} from '../../firebase/FirebaseFunctions';
import './auth.css';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';

const LogOutButton = () => {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };
  
  const handleLogOut = async () => {
    await logOut();
    setOpen(false);
    navigate("/", {replace: true});
  }

    return (
    <React.Fragment>
      <Button onClick={handleClickOpen}>Log Out</Button>
      <Dialog
        open={open}
        onClose={handleClose}
      >
        <DialogTitle>{"Are you sure you want to log out?"}</DialogTitle>
        <DialogActions>
          <Button onClick={handleClose} autoFocus>Go Back</Button>
          <Button onClick={handleLogOut}>I'm Sure</Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
};

export default LogOutButton;