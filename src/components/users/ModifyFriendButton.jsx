import React, {useContext} from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';

const ModifyFriendButton = ({id, name, handler, actionName, icon}) => {
  const [open, setOpen] = React.useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };
  
  const callHandler = async () => {
    await handler(id);
    setOpen(false);
  }

    return (
    <React.Fragment key={`${actionName}-${id}`}>
      <span onClick={handleClickOpen}>{icon}</span>
      <Dialog
        open={open}
        onClose={handleClose}
      >
        <DialogTitle>{`Are you sure you want to ${actionName} ${name}?`}</DialogTitle>
        <DialogActions>
          <Button onClick={handleClose} autoFocus>Nevermind</Button>
          <Button onClick={callHandler}>I'm Sure</Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
};

export default ModifyFriendButton;