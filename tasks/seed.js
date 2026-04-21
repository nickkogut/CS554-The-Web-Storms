import {createUser, getUser} from "../src/components/users/users.js";
import {addFriend, createFriendRequest} from "../src/components/users/friendRequests.js";
import {createNewUserByEmail} from "../src/firebase/FirebaseFunctions.js";
import admin from "../src/firebase/FirebaseAdmin.js";
import {users, friend_requests, blocked_users} from '../config/mongoCollections.js';

const makeUsers = async (names) => {
    const newUsers = [];
    for (const name of names) {
        const newUser = await createUser(crypto.randomUUID(), name); // Note: This uuid is not the same as firebase's, but is effectively equivalent
        newUsers.push(newUser);
    }
    return newUsers;
}

const generateFriendRequests = async (users) => {
    createFriendRequest(users[3]._id, users[0]._id) // from, to
}

const generateFriends = async (users) => {
    await addFriend(users[1]._id, users[0]._id) // from, to
    await addFriend(users[2]._id, users[0]._id)
}

const main = async () => {
    // WARNING: dropping all user-related tables
    let exists;
    const usersCollection = await users();
    exists = await usersCollection.countDocuments();
    if (exists > 0) await usersCollection.drop();

    const requestsCollection = await friend_requests();
    exists = await requestsCollection.countDocuments();
    if (exists > 0) await requestsCollection.drop();

    const blockedCollection = await blocked_users();
    exists = await blockedCollection.countDocuments();
    if (exists > 0) await blockedCollection.drop();

    // Make the main user in firebase if needed
    let fb_user;
    try {
        // Check if user has already been added to firebase (which is global across anyone who runs this seed file)
        fb_user = await admin.auth().getUserByEmail("abd@def.ghi");
    } catch (e) {
        fb_user = await admin.auth().createUser({
        email: "abd@def.ghi",
        password: "TestPass123!",
        displayName: "Test User"
        });
    }
    const testUser = await createUser(fb_user.uid, fb_user.displayName);

    const names = ["other user 1", "other user 2", "other user 3", "other user 4"];
    const createdUsers = [testUser, ...await makeUsers(names)];
    await generateFriendRequests(createdUsers);
    await generateFriends(createdUsers);
    process.exit(0); // seed hangs on mongo otherwise
}

await main();
