import React, {useContext, useState} from 'react';
import {AuthContext} from '../../context/AuthContext';
import {checkPassword, setFBError} from "./authHelpers.js";
import {changePassword} from '../../firebase/FirebaseFunctions';
import './auth.css';
import { Navigate } from 'react-router-dom';

function ChangePassword() {
  const {currentUser} = useContext(AuthContext);
  const [error, setError] = useState("");

  const handleChangePassword = async (ev) => {
    ev.preventDefault();
    let {oldPassword, newPassword, confirmNewPassword} = ev.target.elements;
    let email = currentUser.email;
    try {
        oldPassword = checkPassword(oldPassword.value);
        newPassword = checkPassword(newPassword.value)
        confirmNewPassword = checkPassword(newPassword.value)

        if (newPassword === oldPassword) throw "Error: new password cannot be the same as the old password";
        if (newPassword !== confirmNewPassword) throw "Error: new passwords do not match";

    } catch (e) {
      setError(e);
      return false;
    }

    try {
      await changePassword(email, oldPassword, newPassword);
    } catch (e) {
      setFBError(e, setError);
    }
  };

  if (!currentUser) {
    return (
      <Navigate to="/login" />
    );
  } else if (currentUser.providerData[0].providerId !== 'password') {
    return (
      <>
        <h1>Change Password</h1>
        <p className="auth-error">You are currently signed in using {currentUser.providerData[0].providerId}. Please change your password there.</p>
      </>
    );
    } else {
    return (
        <>
            <h1>Change Password</h1>
            <form className="auth-form" onSubmit={handleChangePassword}>
                <label htmlFor="password">Old Password</label>
                <input name="oldPassword" id="password" type="password" placeholder="Old Password" required />

                <label htmlFor="newPassword">New Password</label>
                <input name="newPassword" id="newPassword" type="password" placeholder="New Password must be 8-32 characters and contain 1 uppercase letter, 1 lowercase letter, 1 number, 1 special character and no spaces" required />

                <label htmlFor="confirmNewPassword">Confirm New Password</label>
                <input name="confirmNewPassword" id="password" type="password" placeholder="Retype New Password" required />

                {error && <p className='auth-error'>{error}</p>}
                <div className="btn-shelf">
                <button className="auth-btn" name="submit-btn" type="submit">Change Password</button>
                </div>
            </form>
        </>
    );
}
}

export default ChangePassword;