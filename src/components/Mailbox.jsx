import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { userAPI } from "./users/userAPI.js";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import IconButton from "@mui/material/IconButton";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import BlockIcon from '@mui/icons-material/Block';
import Divider from '@mui/material/Divider';

export const Mailbox = () => {
  const {currentUser} = useContext(AuthContext);
  const [friendRequests, setFriendRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!currentUser) {
      setLoading(false); // If not authenticated, stop loading. They shouldn't be allowed to see the mailbox
      setError("User not authenticated");
      return;
    }

    const load = async () => {
      try {
        console.log("loading") // debug
        const requests_res = await userAPI.friend.getRequests();
        const requests = requests_res.data?.getFriendRequestsForUser || [];
        setFriendRequests(requests);

        const friends_res = await userAPI.friend.get();
        const friends = friends_res.data?.getFriendsForUser || [];
        setFriends(friends);
        console.log(JSON.stringify(friends)); // DEBUG

      } catch (err) {
        setError("Failed to load friends");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [currentUser, friendRequests]);

  const handleAccept = async (fromId) => {
    try {
      await userAPI.friend.processRequest(fromId, true);
      setFriendRequests((prev) => prev.filter((r) => r.from_id !== fromId));
    } catch (err) {
      setError("Failed to accept request"); // TODO: check if this has to do with blocking and give a better error message
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

  const handleBlock = (fromId) => {
    // TODO
  };

  if (loading) {
    return <div>Loading notifications...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (friendRequests.length === 0) {
    return (
      <>
      <p>TODO: empty inbox</p>
      </>
    )
  }

  return (
    <List sx={{ width: "100%", maxWidth: 360, bgcolor: "background.paper" }}>
      {friendRequests.length > 0 && (
        friendRequests.map((req) => (
          <ListItem
            key={req.from_id}
            disableGutters
            secondaryAction={
              <>
                <IconButton onClick={() => handleAccept(req.from_id)}>
                  <CheckIcon/>
                </IconButton>
                <IconButton onClick={() => handleReject(req.from_id)}>
                  <CloseIcon/>
                </IconButton>
                <IconButton onClick={() => handleBlock(req.from_id)}>
                  <BlockIcon/>
                </IconButton>
              </>
            }
          >
            <ListItemText primary={req.from_name} secondary={"wants to be your friend!"}/>
          </ListItem>
        ))
      )}

      <Divider/>

      {friends.length > 0 && (
        friends.map((friend) => (
          <ListItem key={friend._id}>
            <ListItemText primary={friend.name} />
          </ListItem>
          /* 
          TODO
          sort by lastInteracted time

          If they are in a lobby: display "join lobby" button
          If they are in a game: show some indicator
          If you are in a lobby: display "invite to lobby" button
          Always display unfriend button (should ask for confirmation)
          
          
          */
        ))
      )}

    </List>
  );
};

export default Mailbox;