import admin from '../src/firebase/FirebaseAdmin.js';
import { closeConnection } from '../config/mongoConnection.js';
import {
  users as usersCollectionFn,
  friend_requests as friendRequestsCollectionFn,
  blocked_users as blockedUsersCollectionFn,
  quizzes as quizzesCollectionFn,
  questions as questionsCollectionFn,
  games as gamesCollectionFn
} from '../config/mongoCollections.js';

const DEFAULT_PASSWORD = 'TestPass123!';

/* =====================================================
   USERS
===================================================== */
const authUserBlueprints = [
  { key: 'test', email: 'test.user@quizquest.dev', displayName: 'test' },
  { key: 'kartik', email: 'kartik@quizquest.dev', displayName: 'Kartik' },
  { key: 'thomas', email: 'thomas@quizquest.dev', displayName: 'Thomas' },
  { key: 'nick', email: 'nick@quizquest.dev', displayName: 'Nick' },
  { key: 'praneeth', email: 'praneeth@quizquest.dev', displayName: 'Praneeth' },
  { key: 'justin', email: 'justin@quizquest.dev', displayName: 'Justin' }
];

/* =====================================================
   QUIZZES
===================================================== */
const quizBlueprints = [
  {
    key: 'marvel',
    quizName: 'Marvel Movies Trivia',
    creatorKey: 'kartik',
    createdDaysAgo: 10,
    timesPlayed: 0,
    questions: [
      {
        questionText: 'Who becomes Iron Man?',
        options: ['Tony Stark', 'Steve Rogers', 'Bruce Banner', 'Clint Barton'],
        correctOptions: [0]
      },
      {
        questionText: 'How many Infinity Stones are there?',
        options: ['4', '5', '6', '7'],
        correctOptions: [2]
      },
      {
        questionText: 'Which are Avengers?',
        options: ['Iron Man', 'Batman', 'Thor', 'Hulk'],
        correctOptions: [0, 2, 3]
      },
      {
        questionText: 'What are the weapons of Thor',
        options: ['Mjolnir', 'Stormbreaker', 'Excalibur', 'Leviathan Axe'],
        correctOptions: [0,1]
      },
      {
        questionText: 'Black Panther rules which nation?',
        options: ['Wakanda', 'Atlantis', 'Krypton', 'Asgard'],
        correctOptions: [0]
      }
    ]
  },

  {
    key: 'dc',
    quizName: 'DC Movies Challenge',
    creatorKey: 'thomas',
    createdDaysAgo: 9,
    timesPlayed: 0,
    questions: [
      {
        questionText: 'Batman protects which city?',
        options: ['Metropolis', 'Gotham', 'Star City', 'Central City'],
        correctOptions: [1]
      },
      {
        questionText: 'Superman comes from?',
        options: ['Mars', 'Krypton', 'Earth', 'Titan'],
        correctOptions: [1]
      },
      {
        questionText: 'Justice League members?',
        options: ['Batman', 'Wonder Woman', 'Flash', 'Loki'],
        correctOptions: [0, 1, 2]
      },
      {
        questionText: 'Wonder Woman weapon?',
        options: ['Lasso of Truth', 'Hammer', 'Shield', 'Ring'],
        correctOptions: [0]
      },
      {
        questionText: 'Fastest DC hero?',
        options: ['Flash', 'Aquaman', 'Cyborg', 'Arrow'],
        correctOptions: [0]
      }
    ]
  },

  {
    key: 'harry',
    quizName: 'Harry Potter Trivia',
    creatorKey: 'praneeth',
    createdDaysAgo: 8,
    timesPlayed: 0,
    questions: [
      {
        questionText: 'Harry attends which school?',
        options: ['Hogwarts', 'Oxford', 'MIT', 'Durmstrang'],
        correctOptions: [0]
      },
      {
        questionText: 'Sorting object?',
        options: ['Hat', 'Book', 'Wand', 'Ring'],
        correctOptions: [0]
      },
      {
        questionText: 'House names?',
        options: ['Gryffindor', 'Slytherin', 'Hufflepuff', 'Marvel'],
        correctOptions: [0, 1, 2]
      },
      {
        questionText: 'Disarming spell?',
        options: ['Expelliarmus', 'Lumos', 'Accio', 'Alohomora'],
        correctOptions: [0]
      },
      {
        questionText: 'Three headed dog?',
        options: ['Fluffy', 'Fang', 'Dobby', 'Hedwig'],
        correctOptions: [0]
      }
    ]
  },

  {
    key: 'mission',
    quizName: 'Mission Impossible Quiz',
    creatorKey: 'nick',
    createdDaysAgo: 7,
    timesPlayed: 0,
    questions: [
      {
        questionText: 'Main hero name?',
        options: ['Ethan Hunt', 'Jason Bourne', 'Bond', 'Max'],
        correctOptions: [0]
      },
      {
        questionText: 'Played by?',
        options: ['Tom Cruise', 'Brad Pitt', 'Matt Damon', 'Will Smith'],
        correctOptions: [0]
      },
      {
        questionText: 'IMF means?',
        options: ['Impossible Mission Force', 'Mission File', 'Military Force', 'None'],
        correctOptions: [0]
      },
      {
        questionText: 'Messages usually?',
        options: ['Self destruct', 'Explode city', 'Freeze', 'Disappear'],
        correctOptions: [0]
      },
      {
        questionText: 'Genre?',
        options: ['Action Spy', 'Romance', 'Comedy', 'Horror'],
        correctOptions: [0]
      }
    ]
  },

  {
    key: 'starwars',
    quizName: 'Star Wars Trivia',
    creatorKey: 'justin',
    createdDaysAgo: 6,
    timesPlayed: 0,
    questions: [
      {
        questionText: 'Luke father?',
        options: ['Darth Vader', 'Yoda', 'Han Solo', 'Kenobi'],
        correctOptions: [0]
      },
      {
        questionText: 'Luke home planet?',
        options: ['Tatooine', 'Earth', 'Mars', 'Hoth'],
        correctOptions: [0]
      },
      {
        questionText: 'Droids?',
        options: ['R2-D2', 'C3PO', 'BB8', 'Chewbacca'],
        correctOptions: [0, 1, 2]
      },
      {
        questionText: 'Jedi weapon?',
        options: ['Lightsaber', 'Bow', 'Knife', 'Gun'],
        correctOptions: [0]
      },
      {
        questionText: 'Princess?',
        options: ['Leia', 'Padme', 'Rey', 'All'],
        correctOptions: [3]
      }
    ]
  }
];

/* =====================================================
   HELPERS
===================================================== */
function daysAgo(days) {
  return new Date(Date.now() - days * 86400000).toISOString();
}

function stableUid(key) {
  return `quizquest-${key}`;
}

function normalizeCorrectOptions(arr) {
  return [...new Set(arr)].sort((a, b) => a - b);
}

async function ensureAuthIdentity({ key, email, displayName }) {
  try {
    const existing = await admin.auth().getUserByEmail(email);
    return {
      uid: existing.uid,
      email,
      displayName
    };
  } catch {
    try {
      const created = await admin.auth().createUser({
        uid: stableUid(key),
        email,
        password: DEFAULT_PASSWORD,
        displayName
      });

      return {
        uid: created.uid,
        email,
        displayName
      };
    } catch {
      return {
        uid: stableUid(key),
        email,
        displayName
      };
    }
  }
}

/* =====================================================
   MAIN
===================================================== */
async function main() {
  const usersCol = await usersCollectionFn();
  const requestsCol = await friendRequestsCollectionFn();
  const quizzesCol = await quizzesCollectionFn();
  const questionsCol = await questionsCollectionFn();
  const gamesCol = await gamesCollectionFn();
  await blockedUsersCollectionFn();

  const identities = {};

  for (const user of authUserBlueprints) {
    identities[user.key] = await ensureAuthIdentity(user);
  }

  /* USERS */
  for (const user of authUserBlueprints) {
    const identity = identities[user.key];

    await usersCol.updateOne(
      { _id: identity.uid },
      {
        $set: {
          name: identity.displayName,
          email: identity.email
        },
        $setOnInsert: {
          friends: [],
          quiz_history: []
        }
      },
      { upsert: true }
    );
  }

  /* FRIEND REQUESTS */
  const requests = [
    ['justin', 'kartik'],
    ['thomas', 'test'],
    ['praneeth', 'nick']
  ];

  for (const [fromKey, toKey] of requests) {
    await requestsCol.updateOne(
      {
        from_id: identities[fromKey].uid,
        to_id: identities[toKey].uid
      },
      {
        $set: {
          from_name: identities[fromKey].displayName,
          timestamp: new Date().toISOString()
        }
      },
      { upsert: true }
    );
  }

  /* QUIZZES */
  const quizIdByKey = {};

  for (const quiz of quizBlueprints) {
    const creator = identities[quiz.creatorKey];

    const quizDoc = {
      quizName: quiz.quizName,
      createdBy: creator.displayName,
      createdByUid: creator.uid,
      createdByName: creator.displayName,
      createdAt: daysAgo(quiz.createdDaysAgo),
      updatedAt: new Date().toISOString(),
      timesPlayed: 0,
      copiedFromQuizId: null,
      questions: quiz.questions.map((q) => {
        const correctOptions = normalizeCorrectOptions(q.correctOptions);

        return {
          questionText: q.questionText,
          options: q.options,
          correctOption: correctOptions[0],
          correctOptions
        };
      })
    };

    await quizzesCol.updateOne(
      {
        quizName: quiz.quizName,
        createdByUid: creator.uid
      },
      { $set: quizDoc },
      { upsert: true }
    );

    const saved = await quizzesCol.findOne({
      quizName: quiz.quizName,
      createdByUid: creator.uid
    });

    quizIdByKey[quiz.key] = saved._id.toString();
  }

  /* QUESTIONS */
  for (const quiz of quizBlueprints) {
    const quizId = quizIdByKey[quiz.key];

    for (let i = 0; i < quiz.questions.length; i++) {
      const q = quiz.questions[i];
      const correctOptions = normalizeCorrectOptions(q.correctOptions);

      await questionsCol.updateOne(
        {
          quizId,
          questionIndex: i
        },
        {
          $set: {
            quizId,
            quizName: quiz.quizName,
            questionIndex: i,
            questionText: q.questionText,
            options: q.options,
            correctOption: correctOptions[0],
            correctOptions
          }
        },
        { upsert: true }
      );
    }
  }

  /* GAMES untouched */
  await gamesCol.countDocuments();

  console.log('Seed complete without deleting existing data.');
}

try {
  await main();
} catch (err) {
  console.error('Seed failed:', err);
  throw err;
} finally {
  await closeConnection();
}