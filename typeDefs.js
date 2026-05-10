export const typeDefs = `#graphql
  type Question {
    questionText: String
    options: [String!]
    correctOption: Int
    correctOptions: [Int!]
  }

  type Quiz {
    _id: String
    quizName: String
    createdBy: String
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

  type LeaderboardEntry {
    rank: Int
    playerId: String
    uid: String
    name: String
    score: Int
    connected: Boolean
    answeredCurrentQuestion: Boolean
  }

  type CompletedQuiz {
    roomId: String
    quizId: String
    quizName: String
    pin: String
    totalQuestions: Int
    numPlayers: Int
    finishedAt: String
    leaderboard: [LeaderboardEntry]
    moderator_id: String
    moderator_name: String
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
    correctOption: Int
    correctOptions: [Int!]
  }

  input QuizInput {
    quizName: String!
    createdBy: String
    createdByUid: String
    createdByName: String
    questions: [QuestionInput!]!
  }

  type Query {
    getQuizCatalog: [Quiz]
    getQuizById(quizId: String!): Quiz
    getQuizSessionByCode(code: String!): QuizSession

    getGamesUserById(id: String!): [CompletedQuiz]

    getUser: User
    getUserById(id: String!): User
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
    processFriendRequest(friendId: String!, accept: Boolean!): Friend
  }
`;