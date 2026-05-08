import {users, games} from '../../../config/mongoCollections.js';


export const createUser = async (uid, displayName, email) => {
    const usersCollection = await users();
    const existingUser = await usersCollection.findOne({_id: uid})
    if (existingUser) return existingUser;

    const newUser = {
        _id: uid,
        name: displayName,
        email: email,
        friends: [],
        quiz_history: []
    }

    
    const addedUser = await usersCollection.insertOne(newUser);
    if (!addedUser) throw "Error: failed to add new user";

    return newUser;
}

export const getUser = async (_id) => {
    const usersCollection = await users();
    const user = await usersCollection.findOne({_id})
    return user; // May be empty. The caller would rather check if this is empty than handle an error.

}

export const getGames = async (playerUid) => {
    const gamesCollection = await games();
    const gamesList = await gamesCollection.find({
        'leaderboard.uid': playerUid
    }).toArray();
    return gamesList;
}

export const addQuizToHistory = async (currId, quizResult) => {
    /* 
    quizResult must be of this form:
    quizResult: {
        name,
        moderator_id,
        quiz_id,
        questions_correct,
        questions_total,
        placement, // i.e. 3rd place
        num_participants,
        timestamp, // of completion
    }
    */
    const usersCollection = await users();
    const user = await usersCollection.findOne({_id: currId});
    if (!user) throw "Error: user not found";

    const moderator = await usersCollection.findOne({_id: quiz.moderator_id});
    if (!moderator) throw "Error: moderator not found";

    // Add extra computed fields
    quizResult.timestamp = new Date();
    quizResult.moderator_name = moderator.name;

    const newUser = await usersCollection.updateOne(
        {_id: currId},
        {$push: {quiz_history: quizResult}}
    );

    return newUser;
}










