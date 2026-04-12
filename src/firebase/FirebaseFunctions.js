import {
  getAuth,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  signInWithEmailAndPassword,
  updatePassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';

import {userAPI} from '../components/users/userAPI.js';

async function createNewUserByEmail(email, password, username) {
    const auth = getAuth();
    await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(auth.currentUser, {displayName: username});
    // await createUser(auth.currentUser) // Add to mongo
    await userAPI.user.create();
}

async function changePassword(email, oldPassword, newPassword) {
  // Change password when already logged in
  const auth = getAuth();
  let credential = EmailAuthProvider.credential(email, oldPassword);
  await reauthenticateWithCredential(auth.currentUser, credential);

  await updatePassword(auth.currentUser, newPassword);
  await logOut();
}

async function loginGoogle() {
  let auth = getAuth();
  let socialProvider = new GoogleAuthProvider();
  await signInWithPopup(auth, socialProvider);
  await userAPI.user.create();
}

async function loginEmail(email, password) {
  let auth = getAuth();
  await signInWithEmailAndPassword(auth, email, password);
}

async function resetPassword(email) {
  // Reset password before logging in
  let auth = getAuth();
  await sendPasswordResetEmail(auth, email);
}

async function logOut() {
  let auth = getAuth();
  await signOut(auth);
}

export {
    createNewUserByEmail,
    loginGoogle,
    loginEmail,
    resetPassword,
    logOut,
    changePassword,
}