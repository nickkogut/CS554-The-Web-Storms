// import React from 'react';
import {loginGoogle} from '../../firebase/FirebaseFunctions';
import { setFBError } from './authHelpers';

const GoogleLogin = ({setError}) => {
  return (
    <div>
      <img id="google-img" src="/src/assets/google_login.png" alt="Sign in with Google" onClick={async () => {
            try {
              await loginGoogle();
            } catch (e) {
              setFBError(e, setError);
            }
        }}/>
    </div>
  );
};

export default GoogleLogin;