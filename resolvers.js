import { GraphQLError } from 'graphql';
import { ObjectId } from 'mongodb';

import client from './config/redisClient.js';
import { quizzes as quizCollection } from './config/mongoCollections.js';

const CACHE_KEYS = {
  quiz: (code) => `quiz:${code.toUpperCase()}`
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

function generateQuizCode(length = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
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

async function clearQuizCache(code) {
  try {
    await client.del(CACHE_KEYS.quiz(code));
  } catch (e) {
    console.error('Redis DEL error', e);
  }
}

export const resolvers = {
  Query: {
    getQuizByCode: async (_, args) => {
          const code = ensureString(args.code, 'code').toUpperCase();
          const key = CACHE_KEYS.quiz(code);
    
          const cached = await getCached(key);
          if (cached) return cached;
    
          const col = await quizCollection();
          const quiz = await col.findOne({ code });
    
          if (!quiz) {
            throw new GraphQLError('Quiz not found', {
              extensions: { code: 'NOT_FOUND' }
            });
          }
    
          const result = toGraph(quiz);
          await setCached(key, result);
          return result;
        },

    getQuizCatalog: async () => {
  const quizzesCollection = await quizCollection();

  const allQuizzes = await quizzesCollection.find({}).toArray();

  return allQuizzes.map((quiz) => ({
    _id: quiz._id.toString(),
    code: quiz.code,
    createdBy: quiz.createdBy,
    createdAt: quiz.createdAt,
    questions: quiz.questions
  }));
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

      const createdBy = ensureOptionalString(args.quiz.createdBy, 'createdBy') || 'Anonymous';
      const normalizedQuestions = args.quiz.questions.map((q, index) =>
        ensureQuestionInput(q, index + 1)
      );

      const col = await quizCollection();

      let code = '';
      let existing = null;

      for (let i = 0; i < 20; i += 1) {
        code = generateQuizCode(10);
        existing = await col.findOne({ code });
        if (!existing) break;
      }

      if (existing) {
        throw new GraphQLError('Could not generate a unique quiz code', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' }
        });
      }

      const newDoc = {
        code,
        createdBy,
        createdAt: new Date().toISOString(),
        questions: normalizedQuestions
      };

      const insertResult = await col.insertOne(newDoc);

      if (!insertResult?.insertedId) {
        throw new GraphQLError('Insert failed', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' }
        });
      }

      const created = await col.findOne({ _id: insertResult.insertedId });
      const result = toGraph(created);

      await clearQuizCache(code);
      await setCached(CACHE_KEYS.quiz(code), result);

      return result;
    }
  }
};