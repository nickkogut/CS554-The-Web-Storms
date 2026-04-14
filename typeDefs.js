export const typeDefs = `#graphql
  type Question {
    questionText: String
    options: [String!]
    correctOption: Int
  }

  type Quiz {
    _id: String
    code: String
    quizName: String
    createdBy: String
    createdAt: String
    questions: [Question]
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
    getQuizByCode(code: String!): Quiz
    getQuizCatalog: [Quiz]
  }

  type Mutation {
    createQuiz(quiz: QuizInput!): Quiz
  }
`;