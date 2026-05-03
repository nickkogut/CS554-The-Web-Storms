import { GraphQLError } from 'graphql';
import { ObjectId } from 'mongodb';

import client from './config/redisClient.js';
import { quizzes as quizCollection } from './config/mongoCollections.js';
import { createUser, getUser, addQuizToHistory } from './src/components/users/users.js';
import {
  getFriendRequestsForUser,
  addFriend,
  removeFriend,
  updateLastInteracted,
  blockUser,
  unblockUser,
  createFriendRequest,
  processFriendRequest
} from './src/components/users/friendRequests.js';

const SESSION_TTL_SECONDS = 60 * 60 * 2;
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

function ensureIntArray(arr, varName) {
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new GraphQLError(`${varName} must be a non-empty array`, {
      extensions: { code: 'BAD_USER_INPUT' }
    });
  }

  const values = arr.map((n) => Number(n));
  if (values.some((n) => !Number.isInteger(n) || n < 0 || n > 3)) {
    throw new GraphQLError(`${varName} must contain integers from 0 to 3`, {
      extensions: { code: 'BAD_USER_INPUT' }
    });
  }

  return Array.from(new Set(values)).sort((a, b) => a - b);
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

  let correctOptions = [];
  if (Array.isArray(question.correctOptions)) {
    correctOptions = ensureIntArray(question.correctOptions, `correctOptions for question ${index}`);
  } else if (Number.isInteger(question.correctOption)) {
    correctOptions = [question.correctOption];
  } else {
    throw new GraphQLError(`Question ${index} must have correctOptions`, {
      extensions: { code: 'BAD_USER_INPUT' }
    });
  }

  if (correctOptions.length === 0) {
    throw new GraphQLError(`Question ${index} must have at least one correct option`, {
      extensions: { code: 'BAD_USER_INPUT' }
    });
  }

  return {
    questionText,
    options,
    correctOptions
  };
}

function normalizeQuizDoc(doc) {
  if (!doc) return doc;
  const copy = { ...doc };
  if (copy._id && copy._id.toString) copy._id = copy._id.toString();

  copy.timesPlayed = Number.isInteger(copy.timesPlayed) ? copy.timesPlayed : 0;

  copy.questions = (copy.questions || []).map((q) => {
    if (Array.isArray(q.correctOptions)) {
      return {
        questionText: q.questionText,
        options: q.options,
        correctOptions: q.correctOptions
      };
    }

    if (Number.isInteger(q.correctOption)) {
      return {
        questionText: q.questionText,
        options: q.options,
        correctOptions: [q.correctOption]
      };
    }

    return {
      questionText: q.questionText,
      options: q.options,
      correctOptions: []
    };
  });

  return copy;
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

async function getQuizByIdFromDb(quizId) {
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

  return quiz;
}

export const resolvers = {
  Query: {
    getQuizCatalog: async () => {
      const col = await quizCollection();
      const docs = await col.find({}).sort({ createdAt: -1 }).toArray();
      return docs.map(normalizeQuizDoc);
    },

    getQuizById: async (_, args) => {
      const quiz = await getQuizByIdFromDb(args.quizId);
      return normalizeQuizDoc(quiz);
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

    getFriendRequestsForUser: async (_, __, context) => {
      if (!context.user) throw new GraphQLError('Not authenticated');
      const res = await getFriendRequestsForUser(context.user.uid);
      return res || [];
    },

    getFriendsForUser: async (_, __, context) => {
      if (!context.user) throw new GraphQLError('Not authenticated');
      const user = await getUser(context.user.uid);
      return user?.friends || [];
    },

    getUser: async (_, __, context) => {
      if (!context.user) throw new GraphQLError('Not authenticated');
      const user = await getUser(context.user.uid);
      return user;
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
        updatedAt: new Date().toISOString(),
        timesPlayed: 0,
        copiedFromQuizId: null,
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
      return normalizeQuizDoc(created);
    },

    updateQuiz: async (_, args) => {
      const existing = await getQuizByIdFromDb(args.quizId);

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
      const createdBy = ensureOptionalString(args.quiz.createdBy, 'createdBy') || existing.createdBy || 'Anonymous';
      const normalizedQuestions = args.quiz.questions.map((q, index) =>
        ensureQuestionInput(q, index + 1)
      );

      const col = await quizCollection();
      await col.updateOne(
        { _id: existing._id },
        {
          $set: {
            quizName,
            createdBy,
            questions: normalizedQuestions,
            updatedAt: new Date().toISOString()
          }
        }
      );

      const updated = await col.findOne({ _id: existing._id });
      return normalizeQuizDoc(updated);
    },

    duplicateQuiz: async (_, args, context) => {
      const original = await getQuizByIdFromDb(args.quizId);
      const col = await quizCollection();

      const duplicated = {
        quizName: `${original.quizName} (copy)`,
        createdBy: context.user?.name || context.user?.email || original.createdBy || 'Anonymous',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        timesPlayed: 0,
        copiedFromQuizId: original._id.toString(),
        questions: (original.questions || []).map(ensureQuestionInputForCopy)
      };

      const result = await col.insertOne(duplicated);
      const inserted = await col.findOne({ _id: result.insertedId });
      return normalizeQuizDoc(inserted);
    },

    startQuizSession: async (_, args) => {
      const quiz = await getQuizByIdFromDb(args.quizId);
      const col = await quizCollection();

      await col.updateOne(
        { _id: quiz._id },
        {
          $inc: { timesPlayed: 1 },
          $set: { updatedAt: new Date().toISOString() }
        }
      );

      const refreshedQuiz = await col.findOne({ _id: quiz._id });

      const code = await buildUniqueSessionCode();
      const session = {
        code,
        expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString(),
        quiz: normalizeQuizDoc(refreshedQuiz)
      };

      await saveSessionToRedis(session);
      return session;
    },

    createUser: async (_, __, context) => {
      if (!context.user) throw new GraphQLError('Not authenticated');
      const user = createUser(context.user.uid, context.user.name);
      return user;
    },

    addFriend: async (_, { friendId }, context) => {
      if (!context.user) throw new GraphQLError('Not authenticated');
      const user = await addFriend(context.user.uid, friendId);
      return user;
    },

    removeFriend: async (_, { friendId }, context) => {
      if (!context.user) throw new GraphQLError('Not authenticated');
      const user = await removeFriend(context.user.uid, friendId);
      return user;
    },

    updateLastInteracted: async (_, { friendId }, context) => {
      if (!context.user) throw new GraphQLError('Not authenticated');
      const user = await updateLastInteracted(context.user.uid, friendId);
      return user;
    },

    addQuizToHistory: async (_, { quizResult }, context) => {
      if (!context.user) throw new GraphQLError('Not authenticated');
      const user = await addQuizToHistory(context.user.uid, quizResult);
      return user;
    },

    blockUser: async (_, { friendId }, context) => {
      if (!context.user) throw new GraphQLError('Not authenticated');
      await blockUser(context.user.uid, friendId);
      return true;
    },

    unblockUser: async (_, { friendId }, context) => {
      if (!context.user) throw new GraphQLError('Not authenticated');
      await unblockUser(context.user.uid, friendId);
      return true;
    },

    createFriendRequest: async (_, { friendId }, context) => {
      if (!context.user) throw new GraphQLError('Not authenticated');
      await createFriendRequest(context.user.uid, friendId);
      return true;
    },

    processFriendRequest: async (_, { friendId, accept }, context) => {
      if (!context.user) throw new GraphQLError('Not authenticated');
      await processFriendRequest(context.user.uid, friendId, accept);
      return true;
    }
  }
};

function ensureQuestionInputForCopy(question) {
  return {
    questionText: question.questionText,
    options: Array.isArray(question.options) ? question.options : [],
    correctOptions: Array.isArray(question.correctOptions)
      ? question.correctOptions
      : (Number.isInteger(question.correctOption) ? [question.correctOption] : [])
  };
}