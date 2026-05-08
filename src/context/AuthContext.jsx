// Borrowed from lecture code. This prevents issues when a URL is typed manually

import React, {useState, useEffect} from 'react';
import {onAuthStateChanged} from 'firebase/auth';
import {auth} from "../firebase/FirebaseConfig.js";
export const AuthContext = React.createContext();

export const AuthProvider = ({children}) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  useEffect(() => {
    let myListener = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoadingUser(false);
    });
    return () => {
      if (myListener) myListener();
    };
  }, []);

  if (loadingUser) {
    return (
      <>
        <h1>Loading....</h1>
      </>
    );
  }

  return (
    <AuthContext.Provider value={{currentUser}}>
      {children}
    </AuthContext.Provider>
  );
};