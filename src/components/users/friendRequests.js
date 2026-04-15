import {users, friend_requests, blocked_users} from '../../../config/mongoCollections.js';


export const addFriend = async (currId, friendId) => {
    const usersCollection = await users();
    if (currId === friendId) throw "Error: You cannot friend yourself";

    // Ensure all parties exist and are not already friends
    const user = await usersCollection.findOne({_id: currId});
    const friend = await usersCollection.findOne({_id: friendId});

    if (!user || !friend) throw "Error: could not locate both users";
    if (user.friends.find(friend => friend._id === friendId)) return user; // already friends

    const now = new Date();

    const newUser = await usersCollection.updateOne(
        { _id: currId },
        { $push: 
            { friends: {
            _id: friendId,
            name: friend.name,
            friendTimestamp: now,
            lastInteracted: now
        }}}
    );

    await usersCollection.updateOne(
        { _id: friendId },
        { $push: 
            { friends: {
            _id: currId,
            friendTimestamp: now,
            lastInteracted: now
        }}}
    );

    return newUser;
}

export const removeFriend = async (currId, friendId) => {
    const usersCollection = await users();
    if (currId === friendId) throw "Error: You cannot unfriend yourself";

    const user = await usersCollection.findOne({_id: currId});
    const friend = await usersCollection.findOne({_id: friendId});

    if (!user || !friend) throw "Error: could not locate both users";
    if (!user.friends.find(friend => friend.id === friendId)) throw "Error: You were not already friends";

    const newUser = await usersCollection.updateOne(
        {_id: currId},
        {$pull: {friends: {_id: friendId}}}
    );

    await usersCollection.updateOne(
        {_id: friendId},
        {$pull: {friends: {_id: currId}}}
    );

    return newUser;
}

export const updateLastInteracted = async (currId, friendId) => {
    const usersCollection = await users();
    if (currId === friendId) throw "Error: same user passed as both friends";

    const user = await usersCollection.findOne({_id: currId});
    const friend = await usersCollection.findOne({_id: friendId});

    if (!user || !friend) throw "Error: could not locate both users";
    if (!user.friends.find(f => f.id === friendId)) throw "Error: You were not already friends";

    const now = new Date();

    const newUser = await usersCollection.updateOne(
        {_id: currId, "friends.id": friendId},
        {$set: {"friends.$.last_played": now}}
    );

    await usersCollection.updateOne(
        {_id: friendId, "friends.id": currId},
        {$set: {"friends.$.last_played": now}}
    );

    return newUser;
}

const isBlocked = async (id1, id2) => {
    /*
    Returns
    {
        id1: true/false // id1 blocked id2
        id2: true/false // id2 blocked id1
    }
    */
    const blocksCollection = await blocked_users();
    const blocked = await blocksCollection.find({
        $or: [{blocker_id: id1, blocked_id: id2},
              {blocker_id: id2, blocked_id: id1}]}).toArray();

    return {
        id1: blocked.some(b => b.blocker_id === id1 && b.blocked_id === id2),
        id2: blocked.some(b => b.blocker_id === id2 && b.blocked_id === id1),
    };
};

export const blockUser = async (currId, blockedId) => {
    const usersCollection = await users();
    const blockedCollection = await blocked_users();
    const requestsCollection = await friend_requests();

    if (currId === friendId) throw "Error: cannot block yourself";
    const currUser = await usersCollection.findOne({_id: currId});
    const blockedUser = await usersCollection.findOne({_id: blockedId});
    if (!currUser || !blockedUser) throw "Error: failed to locate both users";

    // Unfriend the user and kill all friend requests to/from them
    if (currUser.friends.find(f => f.id === blockedId)) {
        removeFriend(currId, blockedId);
    }
    await requestsCollection.deleteMany({
        $or: [{ from_id: currId, to_id: friendId },
              { from_id: friendId, to_id: currId }]
    });

    const alreadyBlocked = await blockedCollection.findOne({blocker_id: currId, blocked_id: blockedId});
    if (!alreadyBlocked) {
        const newlyBlocked = await blockedCollection.insertOne({blocker_id: currId, blocked_id: blockedId});
        if (!newlyBlocked) throw "Error: failed to block the user";
    }

    return true;
}

export const unblockUser = async (currId, blockedId) => {
    const usersCollection = await users();
    const blockedCollection = await blocked_users();

    if (currId === friendId) throw "Error: cannot unblock yourself";
    const currUser = await usersCollection.findOne({_id: currId});
    const blockedUser = await usersCollection.findOne({_id: blockedId});
    if (!currUser || !blockedUser) throw "Error: failed to locate both users";

    const alreadyBlocked = await blockedCollection.findOne({blocker_id: currId, blocked_id: blockedId});
    if (alreadyBlocked) {
        const unblock = await blockedCollection.deleteOne({blocker_id: currId, blocked_id: blockedId});
        if (!unblock) throw "Error: failed to unblock user";
    }

    return true;
    
}

export const createFriendRequest = async (currId, friendId) => {
    const usersCollection = await users();
    const requestsCollection = await friend_requests();

    if (currId === friendId) throw "Error: cannot friend yourself";
    const fromUser = await usersCollection.findOne({_id: currId});
    const toUser = await usersCollection.findOne({_id: friendId});
    if (!fromUser || !toUser) throw "Error: failed to locate both users";
    if (fromUser.friends.find(f => f.id === friendId)) throw "Error: you are already friends";

    const blocked = isBlocked(currId, friendId);
    if (blocked[friendId]) return; // Just kill the request. Don't tell the sender that they are blocked
    if (blocked[currId]) throw "Error: You blocked that user. Unblock them and try again.";

    const now = new Date();

    // Check if the target user already sent the current user a request. If so, accept it
    const reverseRequest = await requestsCollection.findOne({from_id: friendId, to_id: currId});
    if (reverseRequest) {
        await processFriendRequest(currId, reverseRequest._id, true);
        return true;
    }

    // Send the request or update the timestamp on an existing one
    const result = await requestsCollection.updateOne(
        {from_id: currId, to_id: friendId},
        {$set: {from_id: currId, to_id: friendId, from_name: fromUser.name, updated_at: now},
        $setOnInsert: {timestamp: now}},
        { upsert: true });

    if (!result.acknowledged) throw "Error: failed to send/update request";
    return true;
};

export const processFriendRequest = async (currId, friendId, accept) => {
    const usersCollection = await users();
    const requestsCollection = await friend_requests();

    const request = await requestsCollection.findOne({from_id: friendId, to_id: currId});
    if (!request) throw "Error: request not found";

    const fromUser = await usersCollection.findOne({_id: currId});
    const toUser = await usersCollection.findOne({_id: friendId});
    if (!fromUser || !toUser) throw "Error: user not found";

    if (accept) {
        addFriend(currId, friendId); // updates both users
    }
    // Kill the request
    await requestsCollection.deleteOne({from_id: request.from_id, to_id: request.to_id});
    return true;

};

export const getFriendRequestsForUser = async (currId) => {
    const requestsCollection = await friend_requests();
    const requests = requestsCollection.find({to_id: currId}).toArray();
    return requests;
}