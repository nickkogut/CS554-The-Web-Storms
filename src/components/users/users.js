import {users} from '../../../config/mongoCollections.js';


export const createUser = async (uid, displayName) => {
    const usersCollection = await users();
    const existingUser = await usersCollection.findOne({id: uid})
    if (existingUser) return existingUser;

    const newUser = {
        id: uid,
        username: displayName,
        friends: [],
        quiz_history: []
    }

    
    const addedUser = await usersCollection.insertOne(newUser);
    if (!addedUser) throw "Error: failed to add new user";

    return addedUser;
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
    const user = await usersCollection.findOne({id: currId});
    if (!user) throw "Error: user not found";

    const moderator = await usersCollection.findOne({id: quiz.moderator_id});
    if (!moderator) throw "Error: moderator not found";

    // Add extra computed fields
    quizResult.timestamp = new Date();
    quizResult.moderator_name = moderator.username;

    const newUser = await usersCollection.updateOne(
        {id: currId},
        {$push: {quiz_history: quizResult}}
    );

    return newUser;
}










