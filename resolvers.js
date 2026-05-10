import { GraphQLError } from 'graphql';
import { ObjectId } from 'mongodb';

import client from './config/redisClient.js';
import { quizzes as quizCollection } from './config/mongoCollections.js';
import {
  createUser,
  getUser,
  addQuizToHistory,
  getGames
} from './src/components/users/users.js';
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

function normalizeCorrectSelection(question, index) {
  if (Array.isArray(question.correctOptions) && question.correctOptions.length > 0) {
    return ensureIntArray(question.correctOptions, `correctOptions for question ${index}`);
  }

  if (Number.isInteger(question.correctOption)) {
    if (question.correctOption < 0 || question.correctOption > 3) {
      throw new GraphQLError(`correctOption for question ${index} must be between 0 and 3`, {
        extensions: { code: 'BAD_USER_INPUT' }
      });
    }
    return [question.correctOption];
  }

  throw new GraphQLError(
    `question ${index} must provide either correctOption or correctOptions`,
    {
      extensions: { code: 'BAD_USER_INPUT' }
    }
  );
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

  const correctOptions = normalizeCorrectSelection(question, index);

  return {
    questionText,
    options,
    correctOption: correctOptions[0],
    correctOptions
  };
}

function normalizeQuizDoc(doc) {
  if (!doc) return doc;

  const copy = { ...doc };

  if (copy._id && copy._id.toString) {
    copy._id = copy._id.toString();
  }

  copy.timesPlayed = Number.isInteger(copy.timesPlayed)
    ? copy.timesPlayed
    : 0;

  copy.questions = (copy.questions || []).map((q) => {
    const correctOptions = Array.isArray(q.correctOptions)
      ? q.correctOptions
      : (Number.isInteger(q.correctOption)
          ? [q.correctOption]
          : []);

    return {
      questionText: q.questionText,
      options: q.options || [],

      // OLD FORMAT SUPPORT
      correctOption:
        Number.isInteger(q.correctOption)
          ? q.correctOption
          : (correctOptions.length > 0 ? correctOptions[0] : 0),

      // NEW FORMAT SUPPORT
      correctOptions
    };
  });

  return copy;
}

function toStr(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  if (typeof value.toISOString === 'function') return value.toISOString();
  if (typeof value.toString === 'function') return value.toString();
  return String(value);
}

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

function requireUser(context) {
  if (!context.user) {
    throw new GraphQLError('Not authenticated', {
      extensions: { code: 'UNAUTHENTICATED' }
    });
  }
  return context.user;
}

function toMongoId(id) {
  try {
    return new ObjectId(id);
  } catch {
    throw new GraphQLError('quizId must be a valid quiz id', {
      extensions: { code: 'BAD_USER_INPUT' }
    });
  }
}

function normalizeQuestionsForCopy(questions) {
  return (questions || []).map((q) => {
    const normalized = normalizeIntList(
      Array.isArray(q.correctOptions)
        ? q.correctOptions
        : (Number.isInteger(q.correctOption) ? [q.correctOption] : [])
    );

    return {
      questionText: q.questionText,
      options: Array.isArray(q.options) ? q.options : [],
      correctOption: normalized[0] ?? 0,
      correctOptions: normalized
    };
  });
}

function resolveCreatorFields(quizInput, contextUser, existingQuiz = null) {
  const fallbackName =
    contextUser?.name ||
    contextUser?.displayName ||
    contextUser?.email ||
    'Anonymous';

  return {
    createdBy: ensureOptionalString(quizInput?.createdBy, 'createdBy') || existingQuiz?.createdBy || fallbackName,
    createdByUid: ensureOptionalString(quizInput?.createdByUid, 'createdByUid') || existingQuiz?.createdByUid || contextUser?.uid || null,
    createdByName: ensureOptionalString(quizInput?.createdByName, 'createdByName') || existingQuiz?.createdByName || fallbackName
  };
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

    getGamesUserById: async (_, { id }) => {
      const games = await getGames(id);
      return games || [];
    },

    getFriendRequestsForUser: async (_, __, context) => {
      requireUser(context);
      const res = await getFriendRequestsForUser(context.user.uid);
      return res || [];
    },

    getFriendsForUser: async (_, __, context) => {
      requireUser(context);
      const user = await getUser(context.user.uid);
      return normalizeUser(user)?.friends || [];
    },

    getUser: async (_, __, context) => {
      if (!context.user) throw new GraphQLError("Not authenticated");

      const user = await getUser(context.user.uid);
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
    }
  },

  Mutation: {
    createQuiz: async (_, args, context) => {
      const user = requireUser(context);

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
      const creator = resolveCreatorFields(args.quiz, user);

      const normalizedQuestions = args.quiz.questions.map((q, index) =>
        ensureQuestionInput(q, index + 1)
      );

      const now = new Date().toISOString();
      const newDoc = {
        quizName,
        createdBy: creator.createdBy,
        createdByUid: creator.createdByUid,
        createdByName: creator.createdByName,
        createdAt: now,
        updatedAt: now,
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

    updateQuiz: async (_, args, context) => {
      const user = requireUser(context);
      const existing = await getQuizByIdFromDb(args.quizId);
      if (existing.createdByUid !== context.user.uid) {
        throw new GraphQLError("You can only edit your own quizzes.");
      }

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
      const creator = resolveCreatorFields(args.quiz, user, existing);
      const normalizedQuestions = args.quiz.questions.map((q, index) =>
        ensureQuestionInput(q, index + 1)
      );

      const col = await quizCollection();
      await col.updateOne(
        { _id: existing._id },
        {
          $set: {
            quizName,
            createdBy: creator.createdBy,
            createdByUid: creator.createdByUid,
            createdByName: creator.createdByName,
            questions: normalizedQuestions,
            updatedAt: new Date().toISOString()
          }
        }
      );

      const updated = await col.findOne({ _id: existing._id });
      return normalizeQuizDoc(updated);
    },

    duplicateQuiz: async (_, args, context) => {
      const user = requireUser(context);
      const original = await getQuizByIdFromDb(args.quizId);
      const col = await quizCollection();

      const creatorName =
        user.name ||
        user.displayName ||
        user.email ||
        original.createdByName ||
        original.createdBy ||
        'Anonymous';

      const duplicated = {
        quizName: `${original.quizName} (copy)`,
        createdBy: creatorName,
        createdByUid: user.uid,
        createdByName: creatorName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        timesPlayed: 0,
        copiedFromQuizId: original._id.toString(),
        questions: normalizeQuestionsForCopy(original.questions)
      };

      const result = await col.insertOne(duplicated);
      const inserted = await col.findOne({ _id: result.insertedId });
      return normalizeQuizDoc(inserted);
    },

    deleteQuiz: async (_, args, context) => {
      requireUser(context);
      const col = await quizCollection();
      const id = toMongoId(args.quizId);
      const deleted = await col.deleteOne({ _id: id });
      return deleted.deletedCount > 0;
    },

    startQuizSession: async (_, args, context) => {
      requireUser(context);
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
    
    // User Mutations
    createUser: async (_, __, context) => {
      requireUser(context);
      const user = createUser(
        context.user.uid,
        context.user.name || context.user.displayName || context.user.email || 'Anonymous'
      );
      return user;
    },

    addFriend: async (_, { friendId }, context) => {
      requireUser(context);
      const user = await addFriend(context.user.uid, friendId);
      return user;
    },

    removeFriend: async (_, { friendId }, context) => {
      requireUser(context);
      const user = await removeFriend(context.user.uid, friendId);
      return user;
    },

    updateLastInteracted: async (_, { friendId }, context) => {
      requireUser(context);
      const user = await updateLastInteracted(context.user.uid, friendId);
      return user;
    },

    addQuizToHistory: async (_, { quizResult }, context) => {
      requireUser(context);
      const user = await addQuizToHistory(context.user.uid, quizResult);
      return user;
    },

    blockUser: async (_, { friendId }, context) => {
      requireUser(context);
      await blockUser(context.user.uid, friendId);
      return true;
    },

    unblockUser: async (_, { friendId }, context) => {
      requireUser(context);
      await unblockUser(context.user.uid, friendId);
      return true;
    },

    createFriendRequest: async (_, { friendId }, context) => {
      requireUser(context);
      await createFriendRequest(context.user.uid, friendId);
      return true;
    },

    processFriendRequest: async (_, { friendId, accept }, context) => {
      requireUser(context);
      const result = await processFriendRequest(context.user.uid, friendId, accept);
      return result;
    }
  }
};
