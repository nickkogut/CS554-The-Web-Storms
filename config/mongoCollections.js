import {dbConnection} from './mongoConnection.js';

const getCollectionFn = (collection) => {
  let _col = undefined;

  return async () => {
    if (!_col) {
      const db = await dbConnection();
      _col = await db.collection(collection);
    }

    return _col;
  };
};

// Listing Collections here
export const questions = getCollectionFn('questions');
export const users = getCollectionFn('users');
export const friend_requests = getCollectionFn('friend_requests');
export const blocked_users = getCollectionFn('blocked_users');