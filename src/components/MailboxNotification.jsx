import React from "react";
import { IconButton, Fade, Box } from "@mui/material";
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import BlockIcon from '@mui/icons-material/Block';
import ModifyFriendButton from "./users/ModifyFriendButton";
import FriendRequestNotification from "./FriendRequestNotification";

const MailboxNotification = ({cardElements, setNotification}) => {
  const Component = cardElements?.component;
  if (!Component) return;
    return (
      <Fade in={!!cardElements} timeout={250} unmountOnExit>
          <Card
            sx={{
              width: '360px',
              position: 'fixed',
              bottom: '16px',
              right: '16px',
              maxHeight: '20vh',
              overflowY: 'hidden',
              borderRadius: '8px',
              borderColor: "black",
              backgroundColor: 'white',
              zIndex: 9999,
            }}
          >
            {/* X close button */}
            <Box sx={{ position: 'absolute', top: 4, right: 4 }}>
              <IconButton size="small" onClick={() => setNotification(null)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
            <Component
              fields={cardElements.fields}
              handlers={cardElements.handlers}
              setNotification={setNotification}
            />
          </Card>
       </Fade>
  );
}

export default MailboxNotification;