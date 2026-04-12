import { GraphQLError } from 'graphql';
import { ObjectId } from 'mongodb';

import client from './config/redisClient.js';
import { questions as questionCollection } from './config/mongoCollections.js';
import { createUser, addQuizToHistory } from './src/components/users/users.js';
import { getFriendRequestsForUser, addFriend, removeFriend, updateLastInteracted, blockUser, unblockUser, 
  createFriendRequest, processFriendRequest } from './src/components/users/friendRequests.js';

const CACHE_KEYS = {
  questionsAll: 'questions'
};

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

async function getCached(key) {
  try {
    const raw = await client.get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Redis GET error', e);
    return null;
  }
}

async function setCached(key, value) {
  try {
    await client.set(key, JSON.stringify(value));
  } catch (e) {
    console.error('Redis SET error', e);
  }
}

async function clearQuestionsCache() {
  try {
    await client.del(CACHE_KEYS.questionsAll);
  } catch (e) {
    console.error('Redis DEL error', e);
  }
}

export const resolvers = {
  Query: {
    getQuestions: async () => {
      const cached = await getCached(CACHE_KEYS.questionsAll);
      if (cached) return cached;

      const col = await questionCollection();
      const docs = await col.find({}).sort({ createdAt: -1 }).toArray();
      const result = docs.map(toGraph);

      await setCached(CACHE_KEYS.questionsAll, result);
      return result;
    },
    // User Queries
    getFriendRequestsForUser: async (_, __, context) => {
      console.log("1")
      console.log(`-----${JSON.stringify(context, null, 2)}`)
      if (!context.user) {
        console.log("2")
        throw new GraphQLError("Not authenticated");
      }
      console.log("3")

    const res = await getFriendRequestsForUser(context.user.uid);
    return res || [];

    }
  },

  Mutation: {
    addQuestions: async (_, args) => {
      if (!Array.isArray(args.questions) || args.questions.length === 0) {
        throw new GraphQLError('questions must be a non-empty array', {
          extensions: { code: 'BAD_USER_INPUT' }
        });
      }

      const normalized = args.questions.map((q, index) => ensureQuestionInput(q, index + 1));
      const now = new Date().toISOString();

      const docsToInsert = normalized.map((q) => ({
        questionText: q.questionText,
        options: q.options,
        correctOption: q.correctOption,
        createdAt: now
      }));

      const col = await questionCollection();
      const insertResult = await col.insertMany(docsToInsert);

      if (!insertResult || !insertResult.insertedIds) {
        throw new GraphQLError('Insert failed', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' }
        });
      }

      const insertedIds = Object.values(insertResult.insertedIds);
      const insertedDocs = await col.find({ _id: { $in: insertedIds } }).toArray();

      const byId = new Map(insertedDocs.map((doc) => [doc._id.toString(), toGraph(doc)]));
      const ordered = insertedIds.map((id) => byId.get(id.toString())).filter(Boolean);

      await clearQuestionsCache();
      return ordered;
    },

    // User Mutations
    createUser: async (_, __, context) => {
    if (!context.user) {
      throw new GraphQLError("Not authenticated");
    }

    const user = createUser(context.user.uid, context.user.displayName);
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