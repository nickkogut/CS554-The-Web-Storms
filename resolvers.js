import { GraphQLError } from 'graphql';
import { ObjectId } from 'mongodb';

import client from './config/redisClient.js';
import { quizzes as quizCollection } from './config/mongoCollections.js';
import { createUser, getUser, addQuizToHistory } from './src/components/users/users.js';
import { getFriendRequestsForUser, addFriend, removeFriend, updateLastInteracted, blockUser, unblockUser, 
  createFriendRequest, processFriendRequest } from './src/components/users/friendRequests.js';

const SESSION_TTL_SECONDS = 60 * 60 * 2; // 2 hours
const SESSION_KEY = (code) => `session:${code.toUpperCase()}`;

function ensureString(input, varName) {
  if (input === undefined || input === null) {
    throw new GraphQLError(`${varName} is required`, {
      extensions: { code: 'BAD_USER_INPUT' }
    });
  }
  if (typeof input !== 'string') {
    throw new GraphQLError(`${varName} must be a string`, {
      extensions: { code: 'BAD_USER_INPUT' }
    });
  }
  const value = input.trim();
  if (!value) {
    throw new GraphQLError(`${varName} cannot be empty`, {
      extensions: { code: 'BAD_USER_INPUT' }
    });
  }
  return value;
}

function ensureOptionalString(input, varName) {
  if (input === undefined || input === null) return undefined;
  return ensureString(input, varName);
}

function ensureQuestionInput(question, index) {
  if (!question || typeof question !== 'object') {
    throw new GraphQLError(`Question ${index} must be an object`, {
      extensions: { code: 'BAD_USER_INPUT' }
    });
  }

  const questionText = ensureString(question.questionText, `questionText for question ${index}`);

  if (!Array.isArray(question.options)) {
    throw new GraphQLError(`options for question ${index} must be an array`, {
      extensions: { code: 'BAD_USER_INPUT' }
    });
  }

  if (question.options.length !== 4) {
    throw new GraphQLError(`question ${index} must have exactly 4 options`, {
      extensions: { code: 'BAD_USER_INPUT' }
    });
  }

  const options = question.options.map((opt, optIndex) =>
    ensureString(opt, `option ${optIndex + 1} for question ${index}`)
  );

  if (!Number.isInteger(question.correctOption)) {
    throw new GraphQLError(`correctOption for question ${index} must be an integer`, {
      extensions: { code: 'BAD_USER_INPUT' }
    });
  }

  if (question.correctOption < 0 || question.correctOption > 3) {
    throw new GraphQLError(`correctOption for question ${index} must be between 0 and 3`, {
      extensions: { code: 'BAD_USER_INPUT' }
    });
  }

  return {
    questionText,
    options,
    correctOption: question.correctOption
  };
}

function toGraph(doc) {
  if (!doc) return doc;
  const copy = { ...doc };
  if (copy._id && copy._id.toString) copy._id = copy._id.toString();
  return copy;
}

// Coerce any value to a string (or null). Handles Date, ObjectId, undefined.
function toStr(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  if (typeof value.toISOString === 'function') return value.toISOString();
  if (typeof value.toString === 'function') return value.toString();
  return String(value);
}

// Ensure a user document conforms to the strict GraphQL User type, regardless
// of how/when it was stored. Some users (e.g. seeded ones) lack email; older
// records may be missing quiz_history; friend timestamps are stored as Date
// objects that the strict String! scalar can refuse to serialize. Without this
// normalization, getUser/getUserById can fail with serialization errors even
// though the underlying record is fine.
function normalizeUser(doc) {
  if (!doc) return null;

  const friends = Array.isArray(doc.friends) ? doc.friends : [];
  const quizHistory = Array.isArray(doc.quiz_history) ? doc.quiz_history : [];

  return {
    _id: toStr(doc._id) || '',
    name: doc.name || 'Unknown',
    email: doc.email || '',
    friends: friends
      .filter((f) => f && f._id)
      .map((f) => ({
        _id: toStr(f._id) || '',
        name: f.name || 'Unknown',
        friendTimestamp: toStr(f.friendTimestamp) || '',
        lastInteracted: toStr(f.lastInteracted) || ''
      })),
    quiz_history: quizHistory
      .filter((q) => q && typeof q === 'object')
      .map((q) => ({
        name: q.name || null,
        moderator_id: q.moderator_id || null,
        quiz_id: q.quiz_id || null,
        questions_correct: typeof q.questions_correct === 'number' ? q.questions_correct : null,
        questions_total: typeof q.questions_total === 'number' ? q.questions_total : null,
        placement: typeof q.placement === 'number' ? q.placement : null,
        num_participants: typeof q.num_participants === 'number' ? q.num_participants : null,
        timestamp: toStr(q.timestamp),
        moderator_name: q.moderator_name || null
      }))
  };
}

function generateSessionCode(length = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function getSessionFromRedis(code) {
  const raw = await client.get(SESSION_KEY(code));
  if (!raw) return null;
  return JSON.parse(raw);
}

async function saveSessionToRedis(session) {
  await client.set(SESSION_KEY(session.code), JSON.stringify(session), {
    EX: SESSION_TTL_SECONDS
  });
}

async function buildUniqueSessionCode() {
  for (let i = 0; i < 20; i += 1) {
    const code = generateSessionCode(10);
    const exists = await client.exists(SESSION_KEY(code));
    if (!exists) return code;
  }

  throw new GraphQLError('Could not generate a unique session code', {
    extensions: { code: 'INTERNAL_SERVER_ERROR' }
  });
}

export const resolvers = {
  Query: {
    getQuizCatalog: async () => {
      const col = await quizCollection();
      const docs = await col.find({}).sort({ createdAt: -1 }).toArray();

      return docs.map((quiz) => ({
        _id: quiz._id.toString(),
        quizName: quiz.quizName,
        createdBy: quiz.createdBy,
        createdAt: quiz.createdAt,
        questions: quiz.questions
      }));
    },

    getQuizSessionByCode: async (_, args) => {
      const code = ensureString(args.code, 'code').toUpperCase();
      const session = await getSessionFromRedis(code);

      if (!session) {
        throw new GraphQLError('Session not found or expired', {
          extensions: { code: 'NOT_FOUND' }
        });
      }

      return session;
    },

    // User Queries
    getFriendRequestsForUser: async (_, __, context) => {
      if (!context.user) throw new GraphQLError("Not authenticated");
      const res = await getFriendRequestsForUser(context.user.uid);
      return res || [];
    },

    getFriendsForUser: async (_, __, context) => {
      if (!context.user) throw new GraphQLError("Not authenticated");

      const user = await getUser(context.user.uid);
      return normalizeUser(user)?.friends || [];
    },

    getUser: async (_, __, context) => {
      if (!context.user) throw new GraphQLError("Not authenticated");

      const user = await getUser(context.user.uid); // Throws if no user found
<<<<<<< Updated upstream
      return user;
=======
      return normalizeUser(user);
    },

    getUserById: async(_, {id})=>{
      const user = await getUser(id);
      if(!user){
        throw new GraphQLError('User not found', {
          extensions: { code: 'NOT_FOUND' }
        });
      }
      return normalizeUser(user);
    },

    getGamesUserById: async(_, {id})=>{
      const games = await getGames(id);
      if(!games){
        throw new GraphQLError('No games found', {
          extensions: { code: 'NOT_FOUND' }
        });      
      }
      return games;
>>>>>>> Stashed changes
    }
  },

  Mutation: {
    createQuiz: async (_, args) => {
      if (!args.quiz || typeof args.quiz !== 'object') {
        throw new GraphQLError('quiz is required', {
          extensions: { code: 'BAD_USER_INPUT' }
        });
      }

      if (!Array.isArray(args.quiz.questions) || args.quiz.questions.length === 0) {
        throw new GraphQLError('questions must be a non-empty array', {
          extensions: { code: 'BAD_USER_INPUT' }
        });
      }

      const quizName = ensureString(args.quiz.quizName, 'quizName');
      const createdBy = ensureOptionalString(args.quiz.createdBy, 'createdBy') || 'Anonymous';
      const normalizedQuestions = args.quiz.questions.map((q, index) =>
        ensureQuestionInput(q, index + 1)
      );

      const newDoc = {
        quizName,
        createdBy,
        createdAt: new Date().toISOString(),
        questions: normalizedQuestions
      };

      const col = await quizCollection();
      const insertResult = await col.insertOne(newDoc);

      if (!insertResult?.insertedId) {
        throw new GraphQLError('Insert failed', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' }
        });
      }

      const created = await col.findOne({ _id: insertResult.insertedId });
      return toGraph(created);
    },

    startQuizSession: async (_, args) => {
      const quizId = ensureString(args.quizId, 'quizId');

      let objectId;
      try {
        objectId = new ObjectId(quizId);
      } catch {
        throw new GraphQLError('quizId must be a valid quiz id', {
          extensions: { code: 'BAD_USER_INPUT' }
        });
      }

      const col = await quizCollection();
      const quiz = await col.findOne({ _id: objectId });

      if (!quiz) {
        throw new GraphQLError('Quiz not found', {
          extensions: { code: 'NOT_FOUND' }
        });
      }

      const code = await buildUniqueSessionCode();
      const session = {
        code,
        expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString(),
        quiz: toGraph(quiz)
      };

      await saveSessionToRedis(session);
      return session;
    },

    // User Mutations
    createUser: async (_, __, context) => {
    if (!context.user) throw new GraphQLError("Not authenticated");
    const user = createUser(context.user.uid, context.user.name);
    return user;
  },

  addFriend: async (_, {friendId}, context) => {
    if (!context.user) throw new GraphQLError("Not authenticated");

    const user = await addFriend(context.user.uid, friendId);
    return user;
  },

  removeFriend: async (_, {friendId}, context) => {
    if (!context.user) throw new GraphQLError("Not authenticated");

    const user = await removeFriend(context.user.uid, friendId);
    return user;
  },

  updateLastInteracted: async (_, {friendId}, context) => {
    if (!context.user) throw new GraphQLError("Not authenticated");

    const user = await updateLastInteracted(context.user.uid, friendId);
    return user;
  },

  addQuizToHistory: async (_, {quizResult}, context) => {
    if (!context.user) throw new GraphQLError("Not authenticated");

    const user = await addQuizToHistory(context.user.uid, quizResult);
    return user;
  },

  blockUser: async (_, {friendId}, context) => {
    if (!context.user) throw new GraphQLError("Not authenticated");

    await blockUser(context.user.uid, friendId);
    return true;
  },

  unblockUser: async (_, {friendId}, context) => {
    if (!context.user) throw new GraphQLError("Not authenticated");

    await unblockUser(context.user.uid, friendId);
    return true;
  },

  createFriendRequest: async (_, {friendId}, context) => {
    if (!context.user) throw new GraphQLError("Not authenticated");

    await createFriendRequest(context.user.uid, friendId);
    return true;
  },

  processFriendRequest: async (_, {friendId, accept}, context) => {
    if (!context.user) throw new GraphQLError("Not authenticated");

    await processFriendRequest(context.user.uid, friendId, accept);
    return true;
  },

  }
};