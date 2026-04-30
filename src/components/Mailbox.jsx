import React, { useEffect, useState, useContext } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { userAPI } from "./users/userAPI.js";
import { gameSocket } from "../socket.js";
import ModifyFriendButton from "./users/ModifyFriendButton.jsx";
import MailboxNotification from "./MailboxNotification.jsx";
import FriendRequestNotification from "./FriendRequestNotification.jsx";
import LobbyInviteNotification from "./LobbyInviteNotification.jsx";
import NewFriendNotification from "./NewFriendNotification.jsx";

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
  const [numNotifications, setNumNotifications] = useState(0);
  const [tempNotifications, setTempNotifications] = useState([]); // A list of friend ids with pending notifications that will be erased on mailbox collapse (e.g. game invites)
  const [notification, setNotification] = useState(null); // Data for the currently displayed notification
  const [canInvite, setCanInvite] = useState(false);
  const navigate = useNavigate();
  
  const handleAccept = async (fromId) => {
    try {
      const processData = await userAPI.friend.processRequest(fromId, true);
      const newFriend = processData.data.processFriendRequest;
      setFriendRequests((prev) => prev.filter((r) => r.from_id !== fromId));
      setNumNotifications((prev) => prev - 1);
      setFriends((prev) => [newFriend, ...prev]);
      setNotification(null); // Close the notification (regardless of what request was accepted)
      
      // Let your friend know that you accepted
      gameSocket.emit("acceptFriendRequest", {"fromId": currentUser.uid, "toId": fromId});
    } catch (err) {
      setError("Failed to accept request");
    }
  };

  const handleReject = async (fromId) => {
    try {
      await userAPI.friend.processRequest(fromId, false);
      setFriendRequests((prev) => prev.filter((r) => r.from_id !== fromId));
      setNumNotifications((prev) => prev - 1);
      setNotification(null); // Close the notification (regardless of what request was rejected)
    } catch (err) {
      setError("Failed to reject request");
    }
  };

  const handleBlock = async (friendId) => {
    try {
      await userAPI.block.block(friendId);
      setFriendRequests((prev) => prev.filter((r) => r.from_id !== friendId));
      setNumNotifications((prev) => prev - 1);
      setNotification(null); // Close the notification (regardless of what user was blocked)
    } catch (err) {
      setError("Failed to reject request");
    }
  };

  const joinFriend = (roomId, friendId) => {
    gameSocket.emit('join_room', {pin: roomId, name: currentUser.displayName, playerId: currentUser.uid}, (response) => {
      if(!response?.ok){
        // setError(response?.error || "Could not join");
        return;
      }
      navigate(`/play/${response.roomId}?playerId=${response.playerId}`);
    });
    try {
      await userAPI.friend.updateLastInteracted(friendId);
    } catch (e) {
      // No action needed
    }
  }

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
        setNumNotifications(requests.length);
        setTempNotifications([]);

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

    const handleInitStatuses = (statuses) => {
      setFriends((prevFriends) => {
          return prevFriends.map((friend) => {
            if (statuses[friend._id]) {
              return { ...friend, status: statuses[friend._id] };
            }
            return friend;
          });
        });
      };

      const handleFriendStatusUpdate = ({uid, status}) => {
        // A friend has changed status
        setFriends((prevFriends) => {
          return prevFriends.map((friend) => {
            if (friend._id === uid) {
              return { ...friend, status, receivedInvite: false };
            }
            return friend;
          });
        });
      };

    const handleUpdateLobbyStatus = async ({canInvite}) => {
      // In a waiting room
      setCanInvite(canInvite);
    }

    const handleFriendsListUpdate = async ({friendId, status, friended}) => {
      if (!friended) {
        // Unfriended
        setFriends((prev) => prev.filter((friend) => friend._id !== friendId));
        // Silently remove them from the friends list
        return;
      }

      try {
        // A friend accepted your request
        const fullFriendsRes = await userAPI.friend.get(currentUser.uid)//.data?.getFriendsForUser || [];
        const fullFriends = fullFriendsRes.data?.getFriendsForUser || [];
        if (fullFriends.length == 0) return;
        
        const newFriend = {status, ...fullFriends.find((f) => f._id === friendId)};
        if (!newFriend) return;

        setFriends((prev) => [newFriend, ...prev]);

        setNotification({
              component: NewFriendNotification,
              fields: {name: newFriend.name},
              handlers: {}
          });
          setTimeout(() => {
            setNotification(null);
          }, 10_000);

      } catch (err) {
        return;
      }
    }
      
    const handleLobbyInvite = ({id}) => {
      setFriends((prevFriends) => {
        let friend;

        const updated = prevFriends.map((f) => {
          if (f._id === id) {
            if (!f.receivedInvite) {
              // Ignore if an invite was already received
              friend = { ...f, receivedInvite: true };
              return friend;
            } 
          }
          return f;
        });
        
        if (friend) {
          const roomId = friend?.status?.roomId;
          if (!tempNotifications.includes(friend._id)) {
            let newTempNotifications = [...tempNotifications, friend._id]
            setTempNotifications((prev) => [...prev, friend._id]);
            setNumNotifications(newTempNotifications.length);
          }

          setNotification({
              component: LobbyInviteNotification,
              fields: {name: friend.name, roomId, friendId: friend._id},
              handlers: {joinFriend}
          });
          setTimeout(() => {
            setNotification(null);
          }, 10_000);
        }
        return updated;
      });
    };
    
    const handleFriendRequest = async ({id}) => {
      console.log("received req ")
      const requests_res = await userAPI.friend.getRequests();
      const requests = requests_res.data?.getFriendRequestsForUser || [];
      console.log(friendRequests.length, requests.length)
      if (friendRequests.length >= requests.length) return; // This request was already handled
  
      setNumNotifications((prev) => prev + 1);
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
    };
      
    load();

    gameSocket.on("initStatuses", handleInitStatuses);
    gameSocket.on("friendsListUpdate", handleFriendsListUpdate);
    gameSocket.on("friendsUpdate", handleFriendStatusUpdate);
    gameSocket.on("updateLobbyStatus", handleUpdateLobbyStatus);
    gameSocket.on("lobbyInvite", handleLobbyInvite);
    gameSocket.on("friendRequest", handleFriendRequest);

    return () => {
    gameSocket.off("initStatuses", handleInitStatuses);
    gameSocket.off("friendsListUpdate", handleFriendsListUpdate);
    gameSocket.off("friendsUpdate", handleFriendStatusUpdate);
    gameSocket.off("updateLobbyStatus", handleUpdateLobbyStatus);
    gameSocket.off("lobbyInvite", handleLobbyInvite);
    gameSocket.off("friendRequest", handleFriendRequest);
    };

  }, []);

  const toggleVisible = () => {
    if (visible) {
      // When closing, remove all temporary notifications (i.e. from game invites)
      setNumNotifications(friendRequests.length);
    }
    
    setVisible(!visible);
  }

  const inviteToLobby = (friendId) => {
    gameSocket.emit("inviteToLobby", {uid: currentUser.uid, friendId});
  }

  const handleUnfriend = async (friendId) => {
    try {
      await userAPI.friend.remove(friendId);
      setFriends((prev) => prev.filter((friend) => friend._id !== friendId));
      gameSocket.emit("unfriend", {"fromId": currentUser.uid, "toId": friendId}); // Silently update the friend's mailbox
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
                  <>
                    {((friend?.status?.status === "online" || friend?.status?.status == "in-lobby") && canInvite) &&
                    <IconButton onClick={() => {inviteToLobby(friend._id)}}>
                      <SendIcon/>
                    </IconButton>
                    }

                    {(friend?.status?.status === "in-lobby") &&
                    <IconButton onClick={() => joinFriend(friend.status.roomId)} variant="contained" size="large"
                    sx={{
                      color: friend?.receivedInvite ? "gold" : "gray",
                    }}>
                      <SportsEsportsIcon/>
                    </IconButton>
                    }


                    {(!friend?.status?.status || friend?.status?.status === "offline" || friend?.status?.status === "busy") &&
                    <Box sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        verticalAlign: "middle",
                        color: friend?.status?.status === "busy" ? "red" : "gray"
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