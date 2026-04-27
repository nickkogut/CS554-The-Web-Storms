import authorizedRequest from '../../../authorizedRequest.js';

export const userAPI = {
  user: {},
  friend: {},
  block: {},
  quizHist: {}
};

userAPI.user.create = async () => {
  return authorizedRequest({
    type: "mutation",
    query: `
      mutation {
        createUser {
          _id
        }
      }
    `,
  });
};

userAPI.user.get = async () => {
  return authorizedRequest({
    type: "query",
    query: `
      getUser {
        _id
        name
        email
      }
    `,
  });
};

userAPI.friend.add = async (friendId) => {
  return authorizedRequest({
    type: "mutation",
    query: `
      mutation AddFriend($friendId: String!) {
        addFriend(friendId: $friendId)
      }
    `,
    variables: { friendId }
  });
};

userAPI.friend.remove = async (friendId) => {
  return authorizedRequest({
    type: "mutation",
    query: `
      mutation RemoveFriend($friendId: String!) {
        removeFriend(friendId: $friendId) {
          _id
          name
        }
      }
    `,
    variables: { friendId }
  });
};

userAPI.friend.updateLastInteracted = async (friendId) => {
  return authorizedRequest({
    type: "mutation",
    query: `
      mutation UpdateLastInteracted($friendId: String!) {
        updateLastInteracted(friendId: $friendId)
      }
    `,
    variables: { friendId }
  });
};

userAPI.friend.get = async (_id) => {
  return authorizedRequest({
    query: `
      query {
        getFriendsForUser {
          _id
          name
          friendTimestamp
          lastInteracted
        }
      }
    `,
    variables: {_id}
  });
};


userAPI.friend.getRequests = async () => {
  return authorizedRequest({
    query: `
      query {
        getFriendRequestsForUser {
          from_id
          from_name
          to_id
          timestamp
        }
      }
    `
  });
};

userAPI.friend.createRequest = async (friendId) => {
  return authorizedRequest({
    type: "mutation",
    query: `
      mutation CreateFriendRequest($friendId: String!) {
        createFriendRequest(friendId: $friendId)
      }
    `,
    variables: { friendId }
  });
};

userAPI.friend.processRequest = async (friendId, accept) => {
  return authorizedRequest({
    type: "mutation",
    query: `
      mutation ProcessFriendRequest($friendId: String!, $accept: Boolean!) {
        processFriendRequest(friendId: $friendId, accept: $accept) {
          _id
          name
          friendTimestamp
          lastInteracted
        }
      }
    `,
    variables: { friendId, accept }
  });
};


userAPI.block.block = async (friendId) => {
  return authorizedRequest({
    type: "mutation",
    query: `
      mutation BlockUser($friendId: String!) {
        blockUser(friendId: $friendId)
      }
    `,
    variables: { friendId }
  });
};

userAPI.block.unblock = async (friendId) => {
  return authorizedRequest({
    type: "mutation",
    query: `
      mutation UnblockUser($friendId: String!) {
        unblockUser(friendId: $friendId)
      }
    `,
    variables: { friendId }
  });
};


userAPI.quizHist.add = async (quizResult) => {
  return authorizedRequest({
    type: "mutation",
    query: `
      mutation AddQuizToHistory($quizResult: QuizResultInput!) {
        addQuizToHistory(quizResult: $quizResult)
      }
    `,
    variables: { quizResult }
  });
};


export default userAPI;
