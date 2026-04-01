import React, {useContext, useState} from 'react';
import GoogleLogin from './GoogleLogin';
import {Navigate} from 'react-router-dom';
import {AuthContext} from '../../context/AuthContext';
import {checkEmail, checkPassword, setFBError} from "./authHelpers.js";
import {loginEmail, resetPassword} from '../../firebase/FirebaseFunctions';

function Login() {
  const {currentUser} = useContext(AuthContext);
  const [error, setError] = useState("");

  const handleLogin = async (ev) => {
    ev.preventDefault();
    let {email, password} = ev.target.elements;
    try {
      email = checkEmail(email.value);
      password = checkPassword(password.value);
    } catch (e) {
      setError(e);
      return false;
    }

    try {
      await loginEmail(email, password);
    } catch (e) {
      setFBError(e, setError);
    }
  };

  const handleResetPassword = () => {
    let email = document.getElementById('email').value;
    email = email.trim();
    if (email) {
      try {
        resetPassword(email);
        alert(`Password reset email was sent to ${email}`);
      } catch (e) {
        setFBError(e, setError);
      }
    } else {
      setError('Please enter an email');
    }
  };

  if (currentUser) {
    return <Navigate to="/" />;
  }
  return (
    <>
      <h1>Login</h1>
      <form className="auth-form" onSubmit={handleLogin}>
        <label htmlFor="email">Email </label>
        <input name="email" id="email" type="email" placeholder="Email" required/>

        <label htmlFor="password">Password </label>
        <input name="password" id="password" type="password" placeholder="Password" autoComplete="off"/>
        {/* Password is not required for Forgot Password */}

        {error && <p className='auth-error'>{error}</p>}
        <div className="btn-shelf">
          <button className="auth-btn" name="submit-btn" type="submit">Login</button>
          <button className="auth-btn" id="reset-password-btn" type="button" onClick={() => handleResetPassword()}>Forgot Password</button>
          <GoogleLogin setError={setError} />
        </div>
        </form>
      <br/>
    </>
  );
}

export default Login;