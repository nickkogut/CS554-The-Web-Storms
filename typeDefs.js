export const typeDefs = `#graphql
  type Question {
    _id: String
    questionText: String
    options: [String!]
    correctOption: Int
    createdAt: String
  }

  input QuestionInput {
    questionText: String!
    options: [String!]!
    correctOption: Int!
  }

  type Query {
    getQuestions: [Question]
  }

  type Mutation {
    addQuestions(questions: [QuestionInput!]!): [Question]
  }
`;