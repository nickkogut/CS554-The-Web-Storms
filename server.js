import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs } from './typeDefs.js';
import { resolvers } from './resolvers.js';
import { connectRedis } from './config/redisClient.js';
import admin from './src/firebase/FirebaseAdmin.js';

await connectRedis();

const server = new ApolloServer({
  typeDefs,
  resolvers,
   
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req, res }) => {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
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
