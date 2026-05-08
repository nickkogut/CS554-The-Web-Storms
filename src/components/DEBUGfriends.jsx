import React from "react";
import userAPI from "./users/userAPI";
import { gameSocket } from "../socket";

const DEBUGfriends = () => {
    const me = "POSnMgm7dpQS9oXzlSLtiJdi6tx2";
    const target = "YEdMSe4MfaX2PSTirxni2sO0aGC3";
    const lobbyId = "asdasdasd";
    const sendReq = async () => {
        gameSocket.emit("sendFriendRequest", {uid: me, friendId: target});

    }

    const inviteToLobby = async () => {
        gameSocket.emit("inviteToLobby", {uid: me, friendId: target});

    }

    const joinLobby = async () => {
        gameSocket.emit("changeStatus", { uid: me, status: lobbyId });
    }

    return (
    <>
    <button onClick={sendReq}>Friend req</button>
    <button onClick={joinLobby}>join lobby</button>
    <button onClick={inviteToLobby}>Invite</button>
    
    
    
    </>)



}

export default DEBUGfriends