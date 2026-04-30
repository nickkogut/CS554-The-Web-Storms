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
import {gameSocket} from "../../socket.js";

async function createNewUserByEmail(email, password, username) {
    const auth = getAuth();
    const newUser = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(newUser.user, {displayName: username});
    await auth.currentUser.getIdToken(true); // Refresh to force the name update through
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
  await updateProfile(auth.currentUser, {displayName: auth.currentUser.displayName || "Anonymous user"});
  await auth.currentUser.getIdToken(true); // Refresh to force the name update through
  await userAPI.user.create();
}

async function loginEmail(email, password) {
  let auth = getAuth();
  await signInWithEmailAndPassword(auth, email, password);
  await userAPI.user.create(); // In case seeding has occurred since the account was created. i.e. make an account with google, seed, log back in
}

async function resetPassword(email) {
  // Reset password before logging in
  let auth = getAuth();
  await sendPasswordResetEmail(auth, email);
}

async function logOut() {
  let auth = getAuth();
  gameSocket.emit("changeStatus", { uid: auth.currentUser.uid, status: "offline" });
  gameSocket.emit("leavePersonalRoom", { uid: auth.currentUser.uid });
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