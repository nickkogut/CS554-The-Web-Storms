import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { userAPI } from "./users/userAPI.js";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import IconButton from "@mui/material/IconButton";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";

export const Mailbox = () => {
  const { currentUser } = useContext(AuthContext); // Get currentUser from AuthContext
  const [friendRequests, setFriendRequests] = useState([]);
  const [loading, setLoading] = useState(true); // For loading state
  const [error, setError] = useState(""); // For error handling

  useEffect(() => {
    if (!currentUser) {
      setLoading(false); // If not authenticated, stop loading
      setError("User not authenticated");
      return;
    }

    const load = async () => {
      try {
        const res = await userAPI.friend.getRequests();
        const requests = res.data?.getFriendRequestsForUser || [];
        setFriendRequests(requests);
      } catch (err) {
        console.error("Failed to load friend requests:", err);
        setError("Failed to load friend requests");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [currentUser]);

  const handleAccept = async (fromId) => {
    try {
      await userAPI.friend.processRequest(fromId, true);
      setFriendRequests((prev) => prev.filter((r) => r.from_id !== fromId));
    } catch (err) {
      console.error("Failed to accept request:", err);
    }
  };

  const handleReject = (fromId) => {
    setFriendRequests((prev) => prev.filter((r) => r.from_id !== fromId));
  };

  if (loading) {
    return <div>Loading...</div>; // Loading state
  }

  if (error) {
    return <div>{error}</div>; // Error message
  }

  return (
    <List sx={{ width: "100%", maxWidth: 360, bgcolor: "background.paper" }}>
      {friendRequests.map((req) => (
        <ListItem
          key={req.from_id}
          disableGutters
          secondaryAction={
            <>
              <IconButton aria-label="accept" onClick={() => handleAccept(req.from_id)}>
                <CheckIcon />
              </IconButton>

              <IconButton aria-label="reject" onClick={() => handleReject(req.from_id)}>
                <CloseIcon />
              </IconButton>
            </>
          }
        >
          <ListItemText primary={req.from_id} />
        </ListItem>
      ))}
    </List>
  );
};

export default Mailbox;