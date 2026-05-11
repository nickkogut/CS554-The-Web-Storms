# CS 554 - The Webstorms - Quiz Quest - 2026S
## Authors

| Name                      | CWID     |
|---------------------------|----------|
| Justin Carnemolla         | 10479754 |
| Nicholas Kogut            | 20023742 |
| Praneeth Sai Ummadisetty  | 20034042 |
| Thomas Vella              | 20024933 |
| Kartik Pantula            | 20029941 |

# Getting Started
## Initial Setup
Please start a docker engine (i.e. Docker Desktop) \
```npm i```\
```npm run docker:dev``` 
- This initializes Redis, RabbitMQ, and Mongo servers and enable them to communicate with the server and each other. This also starts the server.
- Once you see the following in the terminal, the application is live
```backend-1   | Connected to RabbitMQ```
```backend-1   | RabbitMQ connected```
```backend-1   | 🚀 Socket.io ready on port 4001```
```backend-1   | 🚀 GraphQL ready at: http://localhost:4000/```
```npm run seed``` *Note: if you create an account prior to this you will need to re-login* \
```https://localhost:5173/``` \
```npm run docker:down```

---
2 premade accounts are supplied for your convenience. Please feel free to make your own accounts using email/password or Google.
Main test user: \
email: ```test.user@quizquest.dev``` \
pass:  ```TestPass123!```

Secondary test user: You may log in as Kartik, Thomas, Nick, Praneeth, or Justin \
email: ```<name>@quizquest.dev``` \
pass:  ```TestPass123!```

We suggest you use multiple browsers or private browsing tabs to sign in with multiple accounts at once to get the full multiplayer quiz experience!

## On subsequent uses:
```docker compose up``` \
```https://localhost:5173/``` \
```docker compose down```


