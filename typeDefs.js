export const typeDefs = `#graphql
  type Question {
    questionText: String
    options: [String!]
    correctOption: Int
  }

  type Quiz {
    _id: String
    code: String
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
    createdBy: String
    questions: [QuestionInput!]!
  }

  type Query {
    getQuizByCode(code: String!): Quiz
  }

  type Mutation {
    createQuiz(quiz: QuizInput!): Quiz
  }
`;