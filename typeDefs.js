export const typeDefs = `#graphql
  type Question {
    _id: String
    questionText: String
    options: [String!]
    correctOption: Int
    createdAt: String
  }

  type Friend {
  id: String!
  friendTimestamp: String!
  lastInteracted: String!
}

type FriendRequest {
  from_id: String!
  to_id: String!
  timestamp: String!
}

input QuizResultInput {
  name: String!
  moderator_id: String!
  quiz_id: String!
  questions_correct: Int!
  questions_total: Int!
  placement: Int!
  num_participants: Int!
  timestamp: String!
}

type QuizResult {
  name: String
  moderator_id: String
  quiz_id: String
  questions_correct: Int
  questions_total: Int
  placement: Int
  num_participants: Int
  timestamp: String
  moderator_name: String
}

type User {
  id: String
  email: String
  friends: [Friend]
  quiz_history: [QuizResult!]!
}

input QuestionInput {
  questionText: String!
  options: [String!]!
  correctOption: Int!
}

type Query {
  getQuestions: [Question]
  getFriendRequestsForUser: [FriendRequest]
}

type Mutation {
  addQuestions(questions: [QuestionInput!]!): [Question]

  createUser: User
  addFriend(friendId: String!): User
  removeFriend(friendId: String!): User
  updateLastInteracted(friendId: String!): User

  addQuizToHistory(quizResult: QuizResultInput!): User

  blockUser(friendId: String!): Boolean
  unblockUser(friendId: String!): Boolean
  createFriendRequest(friendId: String!): Boolean
  processFriendRequest(friendId: String!, accept: Boolean!): Boolean
}

  
`;