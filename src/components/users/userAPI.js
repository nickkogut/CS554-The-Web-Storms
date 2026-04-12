import { gql } from '@apollo/client';
import { getAuth } from 'firebase/auth';
import client from '../../../apolloClient.js';


const request = async ({ query, variables = {}, type = "query" }) => {
  const auth = getAuth();
  console.log(`auth: ${JSON.stringify(auth)}`);

  if (!auth.currentUser) {
    throw new Error("User not authenticated");
  }

  const token = await auth.currentUser.getIdToken();

  console.log(`token: ${JSON.stringify(token)}`);

  const parsed = gql`${query}`;

  const options = {
    variables,
    context: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  };

  if (type === "mutation") {
    return client.mutate({
      mutation: parsed,
      ...options
    });
  }

  return client.query({
    query: parsed,
    ...options,
    fetchPolicy: "network-only"
  });
};

export const userAPI = {
  user: {},
  friend: {},
  block: {},
  quizHist: {}
};

userAPI.user.create = async () => {
  return request({
    type: "mutation",
    query: `
      mutation {
        createUser
      }
    `
  });
};


userAPI.friend.add = async (friendId) => {
  return request({
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
  return request({
    type: "mutation",
    query: `
      mutation RemoveFriend($friendId: String!) {
        removeFriend(friendId: $friendId)
      }
    `,
    variables: { friendId }
  });
};

userAPI.friend.updateLastInteracted = async (friendId) => {
  return request({
    type: "mutation",
    query: `
      mutation UpdateLastInteracted($friendId: String!) {
        updateLastInteracted(friendId: $friendId)
      }
    `,
    variables: { friendId }
  });
};


userAPI.friend.getRequests = async () => {
  return request({
    query: `
      query {
        getFriendRequestsForUser {
          from_id
          to_id
          timestamp
        }
      }
    `
  });
};

userAPI.friend.createRequest = async (friendId) => {
  return request({
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
  return request({
    type: "mutation",
    query: `
      mutation ProcessFriendRequest($friendId: String!, $accept: Boolean!) {
        processFriendRequest(friendId: $friendId, accept: $accept)
      }
    `,
    variables: { friendId, accept }
  });
};


userAPI.block.block = async (friendId) => {
  return request({
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
  return request({
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
  return request({
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
