import { io } from 'socket.io-client';
const SOCKET_URL = 'http://localhost:4001/';

export const gameSocket = io(SOCKET_URL,
    { autoConnect: false

});