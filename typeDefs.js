export const typeDefs = `#graphql
  type Question {
    questionText: String
    options: [String!]
    correctOption: Int
  }

  type Quiz {
    _id: String
    quizName: String
    createdBy: String
    createdAt: String
    questions: [Question]
  }

  type QuizSession {
    code: String!
    expiresAt: String
    quiz: Quiz!
  }

  input QuestionInput {
    questionText: String!
    options: [String!]!
    correctOption: Int!
  }

  input QuizInput {
    quizName: String!
    createdBy: String
    questions: [QuestionInput!]!
  }

  type Query {
    getQuizCatalog: [Quiz]
    getQuizSessionByCode(code: String!): QuizSession
  }

  type Mutation {
    createQuiz(quiz: QuizInput!): Quiz
    startQuizSession(quizId: String!): QuizSession
  }
`;