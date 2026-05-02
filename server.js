import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { Server } from 'socket.io';
import crypto from 'crypto';
import {createServer} from 'http';

import { typeDefs } from './typeDefs.js';
import { resolvers } from './resolvers.js';
import { connectRedis } from './config/redisClient.js';
import { questions as questionCollection } from './config/mongoCollections.js';
import admin from './src/firebase/FirebaseAdmin.js';
import { getUser } from './src/components/users/users.js';
import { createFriendRequest } from './src/components/users/friendRequests.js';
import { connectRabbitMQ, publish, QUEUES } from './config/rabbitmq.js';

const GRAPHQL_PORT = Number(process.env.PORT) || 4000;
const SOCKET_PORT = Number(process.env.SOCKET_PORT) || 4001;
const QUESTION_TIME_LIMIT_MS = 15000;
const DEFAULT_QUESTION_COUNT = 5;

const rooms = new Map();
const pinToRoomId = new Map();
const socketMeta = new Map();

const userStatusMap = new Map(); // The status of all logged in users, used to initialize the mailbox of a new user when they first log in
const disconnectingUsers = {};

const notifyFriends = async (uid, status) => {
  const user = await getUser(uid);
  if (!user) return;
  const friends = user.friends.map((friend) => friend._id);
  friends.forEach(friendId => {
    if (userStatusMap[friendId]) {
      io.to(friendId).emit('friendsUpdate', {uid, status});
    }
  })
}

const initStatuses = (uid, friend_ids) => {
  // Give users the initial statuses of all friends
  const statuses = {};
  if (!friend_ids) return;
  friend_ids.forEach((friend) => {
    if (userStatusMap[friend]) {
      statuses[friend] = userStatusMap[friend];
    }
  })
  io.to(uid).emit('initStatuses', statuses);
};


const changeStatus = async (uid, newStatus) => {
  if (disconnectingUsers[uid]) { // Hold disconnect requests for a few seconds to prevent a refresh triggering them unintentionally
    clearTimeout(disconnectingUsers[uid]);
    delete disconnectingUsers[uid];
  }

  let status; // The status object that will be emitted to friends / stored in userStatusMap
  
  switch(newStatus) {
    case "online":
      status = {status: "online"};
      const alreadyOnline = (uid in userStatusMap);
      userStatusMap[uid] = status;
      if (!alreadyOnline) {
        notifyFriends(uid, status);
      }
      
      break;
    case "offline":
      status = {status: "offline"}
      disconnectingUsers[uid] = setTimeout(() => {
        const wasDeleted = delete userStatusMap[uid];
        
        if (wasDeleted) {
          notifyFriends(uid, status);
        }
      }, 2000)
      break;
    
    case "busy":
      status = {status: "busy"}
      userStatusMap[uid] = status;
      notifyFriends(uid, status);
      break;
    
    default:
      // newStatus holds the lobby id/pin
      status = {status: "in-lobby", roomId: newStatus}
      userStatusMap[uid] = status;
      notifyFriends(uid, status);
  }
      console.log("changing status: ", uid, newStatus);
      console.log(userStatusMap);
};

function createRoomId() {
  return crypto.randomUUID();
}

function createPin(){
  let pin = '';
  do{
    pin = String(Math.floor(100000 + Math.random() * 900000));
  } while(pinToRoomId.has(pin));
  return pin;
}

function ensureString(value, fieldName){
  if(typeof value !== 'string'){
    throw new Error(`${fieldName} must be a string`);
  }
  value = value.trim();
  if(!value){
    throw new Error(`${fieldName} cannot be empty`);
  }
  return value;
}

function sortPlayers(playersMap){
  return Array.from(playersMap.values()).sort((a,b) =>{
    if(b.score !== a.score)
      return b.score - a.score;
    return a.joinedAt - b.joinedAt;
  });
}

function getRoomByPin(pin){
  const roomId = pinToRoomId.get(pin);
  if(!roomId)
    return null;
  return rooms.get(roomId) || null;
}

function getPublicPlayers(room){
  return sortPlayers(room.players).map((player, index) => {
    return{
      rank: index+1,
      playerId: player.playerId,
      name: player.name,
      uid: player.uid || null,
      score: player.score,
      connected: player.connected,
      answeredCurrentQuestion: room.status === 'question' ? room.answers.has(player.playerId) : false
    };
  });
}

function getRoomSnapshot(room){
  return{
    roomId: room.roomId,
    pin: room.pin,
    hostName: room.hostName,
    status: room.status,
    currentQuestionIndex: room.currentQuestionIndex,
    totalQuestions: room.questions.length,
    questionEndsAt: room.questionEndsAt,
    players: getPublicPlayers(room),
    leaderboard: getPublicPlayers(room),
    latestQuestionResult: room.latestQuestionResult || null
  };
}

function emitRoomSnapshot(io, room){
  io.to(room.roomId).emit('room_snapshot', getRoomSnapshot(room));
}

function storeSocketMeta(socketId, meta){
  socketMeta.set(socketId, meta);
}

function clearSocketMeta(socketId){
  socketMeta.delete(socketId);
}

function clearRoomTimer(room){
  if(room.timer){
    clearTimeout(room.timer);
    room.timer = null;
  }
}

async function getRecentQuestions(limit = DEFAULT_QUESTION_COUNT){
  const col = await questionCollection();
  const docs = await col
    .find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map((doc) => {
    return {
      _id: doc._id.toString(),
      questionText: doc.questionText,
      options: doc.options,
      correctOption: doc.correctOption,
      createdAt: doc.createdAt
    };
  });
}

function finishQuiz(io, room){
  clearRoomTimer(room);
  room.status = 'finished';
  room.questionEndsAt = null;
  const finalLeaderboard = getPublicPlayers(room);
  io.to(room.roomId).emit('quiz_finished', {
    roomId: room.roomId,
    pin: room.pin,
    leaderboard: finalLeaderboard
  });

  publish(QUEUES.QUIZ_RESULT, {
    roomId: room.roomId,
    quizName: room.quizName,
    pin: room.pin,
    totalQuestions: room.questions.length,
    numPlayers: finalLeaderboard.length,
    leaderboard: finalLeaderboard,
    finishedAt: new Date().toISOString()
  })

  emitRoomSnapshot(io, room);

    // Update player statuses
    room.players.forEach((player) => {
      if (player.uid && userStatusMap[player.uid]) {
        changeStatus(player.uid, "online");
      }
    });
}

function closeQuestion(io, roomId){
  const room = rooms.get(roomId);
  if(!room)
    return;
  if(room.status !== 'question')
    return;
  clearRoomTimer(room);
  const question = room.questions[room.currentQuestionIndex];
  const answerStats = [0, 0, 0, 0];
  const playerResults = [];
  for
  (const player of room.players.values()){
    const submitted = room.answers.get(player.playerId) || null;
    let isCorrect = false;
    if(submitted){
      answerStats[submitted.selectedOption] += 1;
      isCorrect = submitted.selectedOption === question.correctOption;
    }

    let tempScore = 0;

    if(isCorrect){
        const time_dif = room.questionEndsAt - submitted.submittedAt;
        const time_score = time_dif / QUESTION_TIME_LIMIT_MS;
        tempScore = Math.round(100 + (900*time_score));
    }

    player.score += tempScore;

    playerResults.push({
      playerId: player.playerId,
      name: player.name,
      selectedOption: submitted ? submitted.selectedOption : null,
      isCorrect,
      score: player.score
    });
  }
  room.latestQuestionResult = {
    questionIndex: room.currentQuestionIndex,
    correctOption: question.correctOption,
    answerStats,
    players: playerResults
  };
  room.status = 'review';
  room.questionEndsAt = null;
  io.to(room.roomId).emit('question_closed', {
    questionIndex: room.currentQuestionIndex,
    correctOption: question.correctOption,
    answerStats,
    players: getPublicPlayers(room)
  });
  emitRoomSnapshot(io, room);
  if(room.currentQuestionIndex === room.questions.length - 1){
    finishQuiz(io, room);
  }
}

function startQuestion(io, room){
  if(!room)
    return;
  if(room.currentQuestionIndex + 1 >= room.questions.length){
    finishQuiz(io, room);
    return;
  }
  clearRoomTimer(room);
  room.currentQuestionIndex += 1;
  room.status = 'question';
  room.answers = new Map();
  room.latestQuestionResult = null;
  room.questionEndsAt = Date.now() + QUESTION_TIME_LIMIT_MS;
  const question = room.questions[room.currentQuestionIndex];
  io.to(room.roomId).emit('question_started', {
    questionIndex: room.currentQuestionIndex,
    totalQuestions: room.questions.length,
    questionText: question.questionText,
    options: question.options,
    endsAt: room.questionEndsAt
  });
  emitRoomSnapshot(io, room);
  room.timer = setTimeout(() => {
    closeQuestion(io, room.roomId);
  }, QUESTION_TIME_LIMIT_MS);
}

await connectRedis();
await connectRabbitMQ();

const apolloServer = new ApolloServer({ typeDefs, resolvers });

const httpServer = createServer();
const io = new Server(httpServer, {cors: {origin: '*'}});
httpServer.listen(SOCKET_PORT, () => {
  console.log(`🚀 Socket.io ready on port ${SOCKET_PORT}`);
});

const { url } = await startStandaloneServer(apolloServer, {
  listen: { port: 4000 },
  context: async ({ req, res }) => {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return { user: null };
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = await admin.auth().verifyIdToken(token);
      return { user: decoded };
    } catch (e) {
      return { user: null };
    }
  }
});
console.log(`🚀 GraphQL ready at: ${url}`);

io.on('connection', (socket) => {
  socket.on('create_room', async (payload, callback) => {
    try{
      const hostName = ensureString(payload?.hostName || 'Host', 'Host name');
      let questions;
      if(Array.isArray(payload?.questions) && payload.questions.length > 0){
        questions = payload.questions;
      }
      else{
      const requestedCount = Number(payload?.questionCount || DEFAULT_QUESTION_COUNT);
      const questionCount = Number.isInteger(requestedCount) && requestedCount > 0 ? requestedCount : DEFAULT_QUESTION_COUNT;
      const questions = await getRecentQuestions(questionCount);
      }
      
      if(!questions.length){
        throw new Error('No questions found. Please create questions first.');
      }
      // const roomId = createRoomId();
      const pin = createPin();
      const roomId = pin;
      const room = {
        roomId,
        pin,
        quizName: payload?.quizName || 'Untitled Quiz',
        hostSocketId: socket.id,
        hostName,
        status: 'lobby',
        questions,
        currentQuestionIndex: -1,
        questionEndsAt: null,
        latestQuestionResult: null,
        answers: new Map(),
        players: new Map(),
        timer: null
      };
      rooms.set(roomId, room);
      pinToRoomId.set(pin, roomId);
      socket.join(roomId);
      storeSocketMeta(socket.id, { roomId, role: 'host' });
      emitRoomSnapshot(io, room);
      callback?.({
        ok: true,
        roomId,
        pin,
        totalQuestions: questions.length
      });
    }
    catch(e){
      callback?.({
        ok: false,
        error: e.message || 'Unable to create room'
    });
  }
  });

  socket.on('watch_room', (payload, callback) => {
    try{
      const roomId = ensureString(payload?.roomId, 'Room ID');
      const room = rooms.get(roomId);
      if(!room){
        throw new Error('Room not found');
      }
      room.hostSocketId = socket.id;
      socket.join(roomId);
      storeSocketMeta(socket.id, { roomId, role: 'host' });
      emitRoomSnapshot(io, room);
      callback?.({
        ok: true,
        room: getRoomSnapshot(room)
      });
    }
    catch(e){
      callback?.({
        ok: false,
        error: e.message || 'Unable to watch room'
      });
    }
  });

  socket.on('join_room', (payload, callback) => {
    try{
      const pin = ensureString(payload?.pin, 'PIN');
      const name = ensureString(payload?.name, 'Player name');
      const playerId = payload?.playerId || createRoomId();
      const room = getRoomByPin(pin);
      if(!room){
        throw new Error('Room not found for that PIN');
      }
      if(room.status === 'finished'){
        throw new Error('This quiz has already finished');
      }

      room.players.set(playerId, {
        playerId,
        name,
        uid: payload?.uid || null,
        score: 0,
        connected: true,
        socketId: socket.id,
        joinedAt: Date.now()
      });
      socket.join(room.roomId);
      storeSocketMeta(socket.id, {
        roomId: room.roomId,
        role: 'player',
        playerId
      });
      
      emitRoomSnapshot(io, room);
      
      callback?.({
        ok: true,
        roomId: room.roomId,
        playerId,
        pin: room.pin,
        room: getRoomSnapshot(room)
      });
      const storedPlayer = room.players.get(playerId);
      if (storedPlayer?.uid && userStatusMap[storedPlayer.uid]) {
        changeStatus(storedPlayer.uid, room.pin);
        io.to(storedPlayer.uid).emit('updateLobbyStatus', {canInvite: true});
      }
      
    }
    catch(e){
      callback?.({ ok: false, error: e.message || 'Unable to join room'});
    }
  });
    
  socket.on('player_reconnect', (payload, callback) => {
    try{
      const roomId = ensureString(payload?.roomId, 'Room ID');
      const playerId = ensureString(payload?.playerId, 'Player ID');
      const room = rooms.get(roomId);
      if(!room){
        throw new Error('Room not found');
      }
      const player = room.players.get(playerId);
      if(!player){
        throw new Error('Player not found');
      }
      player.connected = true;
      player.socketId = socket.id;
      socket.join(room.roomId);
      storeSocketMeta(socket.id, { roomId, role: 'player', playerId });
      emitRoomSnapshot(io, room);
      if(room.status === 'question' && room.currentQuestionIndex >= 0){
        const question = room.questions[room.currentQuestionIndex];
        socket.emit('question_started', {
          questionIndex: room.currentQuestionIndex,
          totalQuestions: room.questions.length,
          questionText: question.questionText,
          options: question.options,
          endsAt: room.questionEndsAt
        });
      }
      callback?.({
        ok: true,
        room: getRoomSnapshot(room)
      });
    }
    catch(e){
      callback?.({
        ok: false,
        error: e.message || 'Unable to reconnect player'
      });
    }
  });
  socket.on('start_quiz', (payload, callback) => {
    try{
      const roomId = ensureString(payload?.roomId, 'Room ID');
      const room = rooms.get(roomId);
      if(!room){
        throw new Error('Room not found');
      }
      if(room.status !== 'lobby'){
        throw new Error('Quiz can only be started from the lobby');
      }
      if(room.players.size === 0){
        throw new Error('At least one player must join before starting');
      }
      startQuestion(io, room);
      callback?.({ ok: true });

      // Update player statuses
      room.players.forEach((player) => {
        if (player.uid && userStatusMap[player.uid]) {
          changeStatus(player.uid, "busy");
          io.to(player.uid).emit('updateLobbyStatus', {canInvite: false});
        }
      });
    }
    catch(e){
      callback?.({ ok: false, error: e.message || 'Unable to start quiz' });
    }
  });
  socket.on('submit_answer', (payload, callback) => {
    try{
      const roomId = ensureString(payload?.roomId, 'Room ID');
      const playerId = ensureString(payload?.playerId, 'Player ID');
      const questionIndex = Number(payload?.questionIndex);
      const selectedOption = Number(payload?.selectedOption);
      const room = rooms.get(roomId);
      if(!room){
        throw new Error('Room not found');
      }
      if(room.status !== 'question'){
        throw new Error('There is no active question right now');
      }
      if(room.currentQuestionIndex !== questionIndex){
        throw new Error('That question is no longer active');
      }
      if(!room.players.has(playerId)){
        throw new Error('Player not found');
      }
      if(!Number.isInteger(selectedOption) || selectedOption < 0 || selectedOption > 3){
        throw new Error('Selected option is invalid');
      }
      if(room.answers.has(playerId)){
        throw new Error('Answer already submitted');
      }
      room.answers.set(playerId, {
        selectedOption,
        submittedAt: Date.now()
      });
      emitRoomSnapshot(io, room);
      const connectedPlayers = Array.from(room.players.values()).filter((player) => {
        return player.connected;
      });
      const allConnectedPlayersAnswered = connectedPlayers.length > 0 && connectedPlayers.every((player) => room.answers.has(player.playerId));
      if(allConnectedPlayersAnswered){
        closeQuestion(io, roomId);
      }
      callback?.({ ok: true });
    }
    catch(e){
      callback?.({ ok: false, error: e.message || 'Unable to submit answer' });
    }
  });
  socket.on('next_question', (payload, callback) => {
    try{
      const roomId = ensureString(payload?.roomId, 'Room ID');
      const room = rooms.get(roomId);
      if(!room){
        throw new Error('Room not found');
      }
      if(room.status === 'finished'){
        throw new Error('Quiz has already finished');
      }
      if(room.status !== 'review'){
        throw new Error('Next question can only start after current question closes');
      }
      startQuestion(io, room); callback?.({ ok: true });
    }
    catch(e){
      callback?.({ ok: false, error: e.message || 'Unable to move to next question' });
    }});

  socket.on('joinPersonalRoom', ({ uid }) => { // For friends notifications
    socket.join(uid);
  });

  socket.on('leavePersonalRoom', ({ uid }) => {
    socket.leave(uid);
  });

  socket.on('changeStatus', async (data) => {
    const uid = data.uid;
    const newStatus = data.status;
    await changeStatus(uid, newStatus);
  });

  socket.on('initStatuses', ({uid, friend_ids}) => {
    initStatuses(uid, friend_ids);
  });

  socket.on('sendFriendRequest', async ({uid, friendId}) => {
    try {
      const req = await createFriendRequest(uid, friendId);
      if (req) {
        io.to(friendId).emit('friendRequest', {id: uid}); // Notify the recipient. Does nothing if they are offline
      }
    } catch (e) {
      return;
    }
  });

  socket.on('inviteToLobby', async ({uid, friendId}) => {
    io.to(friendId).emit('lobbyInvite', {id: uid}); // Tells the friend they have been invited. They already know the roomId
  });

  socket.on('acceptFriendRequest', async ({fromId, toId}) => {
    let status = userStatusMap[fromId] || {status: "offline"};
    // Relay to the receiver that the accepter confirmed their friend request. Note that DB updates are handled before emitting this
    io.to(toId).emit('friendsListUpdate', {friendId: fromId, status, friended: true});
  });

  socket.on('unfriend', async ({fromId, toId}) => {
    // Relay to the friend that they have been unfriended. This should be silent (no notification), but is reflected in the mailbox
    // Note that DB updates are handled before emitting this
    io.to(toId).emit('friendsListUpdate', {friendId: fromId, friended: false});
  });

  socket.on('disconnect', () => {
    const meta = socketMeta.get(socket.id);
    clearSocketMeta(socket.id);
    if(!meta)
      return;
    const room = rooms.get(meta.roomId);
    if(!room)
      return;
    if(meta.role === 'host'){
      room.hostSocketId = null;
    }
    if(meta.role === 'player'){
      const player = room.players.get(meta.playerId);
      if(player){
        player.connected = false;
      }
    }

    emitRoomSnapshot(io, room);
  });
});
