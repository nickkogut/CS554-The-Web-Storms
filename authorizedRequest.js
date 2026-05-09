import { gql } from '@apollo/client';
import {auth} from "./src/firebase/FirebaseConfig.js";
import client from './apolloClient.js';

const authorizedRequest = async ({ query, variables = {}, type = "query", skipAuth = false }) => {
  /*
  Passes the current user as context for a graphql request.

  type: "mutation" or "query"
  query: `...`
  variables: {any variables passed to the query} or omit

  Example Usage:
  const response = await authorizedRequest({
    type: "mutation",
    query: `
      mutation AddFriend($friendId: String!) {
        addFriend(friendId: $friendId)
      }
    `,
    variables: { friendId }
  });
  */
  let headers = {};
  if(!skipAuth){
    if (!auth.currentUser) throw new Error("User not authenticated");
    const token = await auth.currentUser.getIdToken();
    headers.Authorization = `Bearer ${token}`;
  }


  const parsed = gql`${query}`;

  const options = {
    variables,
    context: {
      headers
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

export default authorizedRequest