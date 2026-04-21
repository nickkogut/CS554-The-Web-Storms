import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { userAPI } from "./users/userAPI.js";
import ModifyFriendButton from "./users/ModifyFriendButton.jsx";

import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import IconButton from "@mui/material/IconButton";
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box'
import Collapse from '@mui/material/Collapse';
import Badge from '@mui/material/Badge'

import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import BlockIcon from '@mui/icons-material/Block';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import SendIcon from '@mui/icons-material/Send';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import DoNotDisturbOnIcon from '@mui/icons-material/DoNotDisturbOn';
import js from "@eslint/js";


export const Mailbox = () => {
  const {currentUser} = useContext(AuthContext);
  const [friendRequests, setFriendRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false); // If not authenticated, stop loading. They shouldn't be allowed to see the mailbox
      setError("User not authenticated");
      return;
    }

    const load = async () => {
      try {
        const requests_res = await userAPI.friend.getRequests();
        const requests = requests_res.data?.getFriendRequestsForUser || [];
        setFriendRequests(requests);

        const friends_res = await userAPI.friend.get();
        const friends = friends_res.data?.getFriendsForUser || [];
        setFriends(friends);

      } catch (err) {
        setError("Failed to load friends");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [currentUser]);

  const handleUnfriend = async (friendId) => {
    try {
      await userAPI.friend.remove(friendId);
      setFriends((prev) => prev.filter((friend) => friend._id !== friendId));
    } catch (err) {
      setError("Failed to remove friend");
    }
  }

  const handleAccept = async (fromId) => {
    try {
      const processData = await userAPI.friend.processRequest(fromId, true);
      const newFriend = processData.data.processFriendRequest;
      setFriendRequests((prev) => prev.filter((r) => r.from_id !== fromId));
      setFriends((prev) => [newFriend, ...prev]);
    } catch (err) {
      setError("Failed to accept request");
    }
  };

  const handleReject = async (fromId) => {
    try {
      await userAPI.friend.processRequest(fromId, false);
      setFriendRequests((prev) => prev.filter((r) => r.from_id !== fromId));
    } catch (err) {
      setError("Failed to reject request");
    }
  };

  const handleBlock = async (friendId) => {
    try {
      await userAPI.block.block(friendId);
      setFriendRequests((prev) => prev.filter((r) => r.from_id !== friendId));
    } catch (err) {
      setError("Failed to reject request");
    }
  };

  return (
    <div id="mailbox">
      <IconButton onClick={() => setVisible(!visible)} sx={{ background: "white" }}>
        <Badge
          badgeContent={friendRequests.length /*TODO: + new game join requests*/}
          color="error"
          overlap="circular"
          anchorOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
          invisible={friendRequests.length === 0 /*TODO: + new game join requests*/}
        >
          <PeopleAltIcon />
        </Badge>
      </IconButton>

      {visible && !loading && (
        <Collapse in={visible} timeout={100} unmountOnExit>
        <List sx={{
          width: '360px',
          position: 'absolute',
          top: "64px",
          right: 0,
          maxHeight: "60vh",
          overflowY: "auto",
          borderColor: 'black',
          borderStyle: 'solid',
          borderWidth: '1px',
          borderRadius: '8px',
        }}>
          
          {friendRequests.length > 0 && (
            [...friendRequests] // Cannot sort friendRequests itself
            .sort((r1, r2) => {return Number(r2.timestamp) - Number(r1.timestamp)})
            .map((req) => (
              <ListItem
                key={`request-${req.from_id}`}
                disableGutters
                secondaryAction={
                  <>
                    <IconButton onClick={() => handleAccept(req.from_id)} sx={{color: "green"}}>
                      <CheckIcon/>
                    </IconButton>
                    
                    <IconButton onClick={() => handleReject(req.from_id)} sx={{color: "red"}}>
                      <CloseIcon/>
                    </IconButton>

                    <IconButton>
                      <ModifyFriendButton id={req.from_id} name={req.from_name} handler={handleBlock} actionName={"block"} icon={<BlockIcon/>} />
                    </IconButton>
                  </>
                }
              >
                <ListItemText 
                  primary={req.from_name} 
                  secondary={"wants to be your friend!"}
                  primaryTypographyProps={{
                    color: "gray", 
                    fontWeight: "bold",
                    maxWidth: "200px",
                    marginLeft: "10px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  secondaryTypographyProps={{
                    color: "lightgray",
                    marginLeft: "10px",
                  }}
                  />
              </ListItem>
            ))
          )}

          {(friendRequests.length > 0 && friends.length > 0) 
          ? (<Divider/>) 
          : ((friendRequests.length == 0 && friends.length == 0) &&<ListItem><ListItemText 
                  primary="No friend activity yet" 
                  primaryTypographyProps={{
                    color: "black", 
                    marginLeft: "10px",
                  }}
                  />
              </ListItem>)}

          {friends.length > 0 && (
            [...friends] // Cannot sort friends itself
              .sort((f1, f2) => {return Number(f2.lastInteracted) - Number(f1.lastInteracted)})
              .map((friend) => (
              <ListItem key={`friend-${friend._id}`}
              disableGutters
              secondaryAction={
              /* 
              TODO
              If they are in a lobby: display "join lobby" button (game controller - color indicates if they requested you)
              If they are in a game or offline: show indicator (do not disturb icon) - and no other indicators
              If you are in a lobby: display "invite to lobby" button (paper airplane send icon)
              
              */

                  <>
                    <IconButton onClick={() => {/* TODO: Invite them to your game - green if you already sent an invite*/}}>
                      <SendIcon/>
                    </IconButton>
                    
                    <IconButton onClick={() => {/* TODO: Join their game - gold if they invited you*/}}>
                      <SportsEsportsIcon/>
                    </IconButton>
                    {}
                    <Box sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        verticalAlign: "middle",
                      }}
                    >
                      <DoNotDisturbOnIcon sx={{fontSize: 24, color: "gray" /* TODO: Red if in a game, gray if offline - don't show otherwise*/}} />
                    </Box>
                    
                    <IconButton>
                      <ModifyFriendButton id={friend._id} name={friend.name} handler={handleUnfriend} actionName={"unfriend"} icon={<PersonRemoveIcon/>} />
                    </IconButton>
                  </>
              }
              >
                <ListItemText 
                  primary={friend.name} 
                  primaryTypographyProps={{
                    color: "gray", 
                    fontWeight: "bold",
                    maxWidth: "200px",
                    marginLeft: "10px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  />
              </ListItem>
            ))
          )}

          </List>
        
          </Collapse>
        )}
  </div>
  );
};

export default Mailbox;