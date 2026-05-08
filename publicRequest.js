import { gql } from '@apollo/client';
import client from './apolloClient.js';

const publicRequest = async ({ query, variables = {}, type = "query" }) => {

  const parsed = gql`${query}`;

  const options = {
    variables
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

export default publicRequest