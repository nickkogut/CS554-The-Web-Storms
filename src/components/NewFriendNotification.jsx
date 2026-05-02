import React from "react";
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

const NewFriendNotification = ({fields, handlers, setNotification}) => {

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
              has accepted your friend request!
            </Typography>
          </CardContent>
        </>
  );
}

export default NewFriendNotification;