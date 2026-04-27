import React from "react";
import { IconButton } from "@mui/material";
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import BlockIcon from '@mui/icons-material/Block';
import ModifyFriendButton from "./users/ModifyFriendButton";

const LobbyInviteNotification = ({fields, handlers, setNotification}) => {

  const acceptAndClose = (handler) => {
      handlers.handleJoin(fields.roomId);
      setNotification(null);
  }
  return (
        <>
          <CardContent>
            <Typography
              color="gray"
              fontWeight="bold"
              maxWidth="200px"
              marginLeft="10px"
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
            >
              {fields.name}
            </Typography>
            <Typography color="lightgray" marginLeft="10px">
              has invited you to join their quiz: {roomId}
            </Typography>
          </CardContent>

          <CardActions>
            <Button onClick={() => acceptAndClose()}>
              Join
            </Button>
          </CardActions>
        </>
  );
}

export default LobbyInviteNotification;