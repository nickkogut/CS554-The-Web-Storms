export const typeDefs = `#graphql
  type Question {
    questionText: String
    options: [String!]
    correctOptions: [Int!]!
  }

  type Quiz {
    _id: String
    quizName: String
    createdByUid: String
    createdByName: String
    createdAt: String
    updatedAt: String
    copiedFromQuizId: String
    timesPlayed: Int
    questions: [Question]
  }

  type QuizSession {
    code: String!
    expiresAt: String
    quiz: Quiz!
  }

  type Friend {
    _id: String!
    name: String!
    friendTimestamp: String!
    lastInteracted: String!
  }

  type FriendRequest {
    from_id: String!
    from_name: String!
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
    _id: String!
    name: String!
    email: String!
    friends: [Friend!]!
    quiz_history: [QuizResult!]!
  }

  input QuestionInput {
    questionText: String!
    options: [String!]!
    correctOptions: [Int!]!
  }

  input QuizInput {
    quizName: String!
    questions: [QuestionInput!]!
  }

  type Query {
    getQuizCatalog: [Quiz]
    getQuizById(quizId: String!): Quiz
    getQuizSessionByCode(code: String!): QuizSession

    getUser: User
    getFriendRequestsForUser: [FriendRequest]
    getFriendsForUser: [Friend]
  }

  type Mutation {
    createQuiz(quiz: QuizInput!): Quiz
    updateQuiz(quizId: String!, quiz: QuizInput!): Quiz
    duplicateQuiz(quizId: String!): Quiz
    deleteQuiz(quizId: String!): Boolean
    startQuizSession(quizId: String!): QuizSession

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