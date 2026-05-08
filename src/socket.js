import { onAuthStateChanged } from "firebase/auth";
import {auth} from "./firebase/FirebaseConfig.js";
import { io } from 'socket.io-client';
const SOCKET_URL = 'http://localhost:4001/';

export const gameSocket = io(SOCKET_URL,
    { autoConnect: true}
);

onAuthStateChanged(auth, (user) => {
  if (user) {
    // logged in
    gameSocket.emit("changeStatus", { uid: auth.currentUser.uid, status: "online", fromLoad: true});
    gameSocket.emit("joinPersonalRoom", { uid: auth.currentUser.uid });
  } 
  // Otherwise, the user logged out. Their status will be handled in FirebaseFunctions.js - logOut()
});

window.addEventListener('beforeunload', () => {
  // Theoretically 'disconnect' handles this too, but its safer to be redundant to avoid dangling statuses
  if (auth.currentUser) {
    gameSocket.emit("changeStatus", { uid: auth.currentUser.uid, status: "offline" });
    gameSocket.emit("leavePersonalRoom", { uid: auth.currentUser.uid });
  }
});

gameSocket.on('disconnect', () => {
  if (auth.currentUser) {
      gameSocket.emit("changeStatus", { uid: auth.currentUser.uid, status: "offline" });
      gameSocket.emit("leavePersonalRoom", { uid: auth.currentUser.uid });
  }
});