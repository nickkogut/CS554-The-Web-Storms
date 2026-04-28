import React, { useEffect, useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { userAPI } from "./users/userAPI.js";
import { gameSocket } from "../socket.js";
import ModifyFriendButton from "./users/ModifyFriendButton.jsx";
import MailboxNotification from "./MailboxNotification.jsx";
import FriendRequestNotification from "./FriendRequestNotification.jsx";

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



export const Mailbox = () => {
  const {currentUser} = useContext(AuthContext);
  const [friendRequests, setFriendRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  const [numNotifications, setNumNotifactions] = useState(0);
  const [notification, setNotification] = useState(null);
  const navigate = useNavigate();
  
  const handleAccept = async (fromId) => {
    try {
      const processData = await userAPI.friend.processRequest(fromId, true);
      const newFriend = processData.data.processFriendRequest;
      setFriendRequests((prev) => prev.filter((r) => r.from_id !== fromId));
      setNumNotifactions((prev) => prev - 1);
      setFriends((prev) => [newFriend, ...prev]);
    } catch (err) {
      setError("Failed to accept request");
    }
  };

  const handleReject = async (fromId) => {
    try {
      await userAPI.friend.processRequest(fromId, false);
      setFriendRequests((prev) => prev.filter((r) => r.from_id !== fromId));
      setNumNotifactions((prev) => prev - 1);
    } catch (err) {
      setError("Failed to reject request");
    }
  };

  const handleBlock = async (friendId) => {
    try {
      await userAPI.block.block(friendId);
      setFriendRequests((prev) => prev.filter((r) => r.from_id !== friendId));
      setNumNotifactions((prev) => prev - 1);
    } catch (err) {
      setError("Failed to reject request");
    }
  };

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
        setNumNotifactions(requests.length);

        const friends_res = await userAPI.friend.get();
        const friends = friends_res.data?.getFriendsForUser || [];
        const friend_ids = friends.map((friend) => friend._id);
        setFriends(friends);
        gameSocket.emit("initStatuses", {uid: currentUser.uid, friend_ids});

      } catch (err) {
        setError("Failed to load friends");
      } finally {
        setLoading(false);
      }
    };

    load();

    gameSocket.on("initStatuses", (statuses) => {
      setFriends((prevFriends) => {
        return prevFriends.map((friend) => {
          if (statuses[friend._id]) {
            return { ...friend, status: statuses[friend._id] };
          }
          return friend;
        });
      });
    });

    gameSocket.on("friendsUpdate", ({uid, status}) => {
      setFriends((prevFriends) => {
        return prevFriends.map((friend) => {
          if (friend._id === uid) {
            return { ...friend, status, receivedInvite: false };
          }
          return friend;
        });
      });
    });

    gameSocket.on("lobbyInvite", ({id}) => {
      let code;
        setFriends((prevFriends) => {
        return prevFriends.map((friend) => {
          if (friend._id === id) {
            code = friend?.status?.code;
            return { ...friend, receivedInvite: true };
          }
          return friend;
        });
        return [...prevFriends];
      });

      // Display a notification
      const handleJoin = (roomId) => navigate(`/join/${roomId}`); /*TODO: get correct url*/
      if (code) {
        setNotification({
          component: FriendRequestNotification,
          fields: {name: req.from_name, roomId: code},
          handlers: {handleJoin}
        });
        setTimeout(() => {
          setNotification(null);
        }, 10_000);

      }
    });

    gameSocket.on("friendRequest", async ({id}) => {
      const requests_res = await userAPI.friend.getRequests();
      const requests = requests_res.data?.getFriendRequestsForUser || [];
      if (friendRequests.length < requests.length) setNumNotifactions(numNotifications - friendRequests.length + requests.length);
      setFriendRequests(requests);
      
      // display notification
      const req = requests.find((r) => r.from_id === id);
      if (req) {
        setNotification({
          component: FriendRequestNotification,
          fields: {name: req.from_name, id: req.from_id},
          handlers: {handleAccept, handleReject, handleBlock}
        });
        setTimeout(() => {
          setNotification(null);
        }, 10_000);
      }
    });

  }, [currentUser]);

  const toggleVisible = () => {
    // When closing, remove all temporary notifications (i.e. from game invites)
    setNumNotifactions(friendRequests.length);
    setVisible(!visible);
  }

  const inviteToLobby = (friendId) => {
    gameSocket.emit("inviteToLobby", {uid: currentUser.uid, friendId});
  }

  const handleUnfriend = async (friendId) => {
    try {
      await userAPI.friend.remove(friendId);
      setFriends((prev) => prev.filter((friend) => friend._id !== friendId));
    } catch (err) {
      setError("Failed to remove friend");
    }
  }

  return (
    <div id="mailbox">
      <IconButton onClick={() => toggleVisible()} sx={{ background: "white" }}>
        <Badge
          badgeContent={numNotifications}
          color="error"
          overlap="circular"
          anchorOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
          invisible={numNotifications === 0}
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
              If they are in a lobby: display "join lobby" button (game controller - color indicates if they requested you)
              If they are in a game or offline: show indicator (do not disturb icon) - and no other indicators
              If you are in a lobby: display "invite to lobby" button (paper airplane send icon)
              */

                  <>
                    {(friend?.status?.status === "online" || friend?.status?.status == "in-lobby" /*TODO": and you are in a lobby*/) &&
                    <IconButton onClick={() => {inviteToLobby(friend._id)}}>
                      <SendIcon/>
                    </IconButton>
                    }


                    {(friend?.status?.status === "in-lobby") &&
                    <IconButton component={Link} to={`/join/${friend.status.code}`} variant="contained" size="large" 
                    sx={{
                      color: friend?.receivedInvite ? "gold" : "gray",
                    }}>
                      {/* TODO: get correct url */}
                      <SportsEsportsIcon/>
                    </IconButton>
                    }


                    {(!friend?.status?.status || friend?.status?.status === "offline" || friend?.status?.status === "busy") &&
                    <Box sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        verticalAlign: "middle",
                        color: friend?.status?.status === "busy" ? "red" : "gray"
                        // Red if in a game, gray if offline
                      }}>
                      <DoNotDisturbOnIcon sx={{fontSize: 24}} />
                    </Box>
                  }
                    
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
        {notification && 
        <MailboxNotification
          cardElements={notification}
          setNotification={setNotification}
        />}
  </div>
  );
};

export default Mailbox;