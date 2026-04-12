import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs } from './typeDefs.js';
import { resolvers } from './resolvers.js';
import { connectRedis } from './config/redisClient.js';
import admin from './src/firebase/FirebaseAdmin.js';


const server = new ApolloServer({
  typeDefs,
  resolvers,
   
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },

  /*
  https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library
  Allows for firebase to verify that the authenticated user made the request regarding themselves.
  In resolvers.js use: 
  foo: async (_, {...}, context) => {
    if (!context.user) throw new GraphQLError("Not authenticated");
  */

  context: async ({ req, res }) => {
    console.log("HIT CONTEXT"); // <-- you should now see this

    const authHeader = req.headers.authorization || "";
    console.log("AUTH:", authHeader);

    if (!authHeader.startsWith("Bearer ")) {
      console.log("auth header doesn't start with bearer")
      return { user: null };
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = await admin.auth().verifyIdToken(token);
      return { user: decoded };
    } catch (e) {
      return { user: null };
    }
  }
  
});

console.log(`🚀 Server ready at: ${url}`);