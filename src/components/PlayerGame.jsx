import React, { useEffect, useState } from "react";
import { gameSocket } from "../socket.js";
import WaitingRoom from "./WaitingRoom";
import PlayerRoom from "./PlayerRoom";
import { useParams, useSearchParams } from "react-router-dom";

export default function PlayerGame() {
    const { roomId } = useParams();
    const [searchParams] = useSearchParams();
    const queryPlayerId = searchParams.get("playerId");
    const storedPlayerId = localStorage.getItem("quiz_playerId");
    const playerId = queryPlayerId || storedPlayerId;

    const [room, setRoom] = useState(null);

    useEffect(() => {
        const onRoomSnapshot = (snapshot) => {
            setRoom(snapshot);
        };

        gameSocket.on('room_snapshot', onRoomSnapshot);

        if (playerId) {
            gameSocket.emit('player_reconnect', { roomId, playerId }, (response) => {
                if (response?.ok) {
                    setRoom(response.room);
                }
            });
        }

        return () => {
            gameSocket.off('room_snapshot', onRoomSnapshot);
        };
    }, [roomId, playerId]);

    if (!room || room.status === 'lobby') {
        return <WaitingRoom joinedCount={room?.players?.length ?? 0} mode="waiting" players={room?.players ?? []} />;
    }

    return <PlayerRoom />;
}