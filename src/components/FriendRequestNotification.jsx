import React from "react";
import { IconButton } from "@mui/material";
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import BlockIcon from '@mui/icons-material/Block';
import ModifyFriendButton from "./users/ModifyFriendButton";

const FriendRequestNotification = ({fields, handlers, setNotification}) => {

  const chooseOptionAndClose = (handler, arg) => {
      handler(arg);
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
              wants to be your friend!
            </Typography>
          </CardContent>

          <CardActions>
            <IconButton onClick={() => chooseOptionAndClose(handlers.handleAccept, fields.id)} sx={{ color: "green" }}>
              <CheckIcon />
            </IconButton>

            <IconButton onClick={() => chooseOptionAndClose(handlers.handleReject, fields.id)} sx={{ color: "red" }}>
              <CloseIcon />
            </IconButton>

            <IconButton>
                <ModifyFriendButton id={fields.id} name={fields.name} handler={() => chooseOptionAndClose(handlers.handleBlock, fields.id)} actionName={"block"} icon={<BlockIcon/>} />
            </IconButton>
          </CardActions>
        </>
  );
}

export default FriendRequestNotification;