import React, {useContext, useState} from 'react';
import {Link, Navigate} from 'react-router-dom';
import {createNewUserByEmail} from '../../firebase/FirebaseFunctions.js';
import {AuthContext} from '../../context/AuthContext.jsx';
import GoogleLogin from './GoogleLogin.jsx';
import {checkEmail, checkPassword, checkUsername, setFBError} from "./authHelpers.js";
import {checkNumber} from "../../helpers.js";
import './auth.css';

function SignUp() {
  const {currentUser} = useContext(AuthContext);
  const [error, setError] = useState("");
  const handleSignUp = async (ev) => {
    ev.preventDefault();
    let {username, email, password, confirmPassword, age} = ev.target.elements;
    try {
      username = checkUsername(username.value);
      email = checkEmail(email.value);
      password = checkPassword(password.value);
      confirmPassword = checkPassword(confirmPassword.value);
      age = checkNumber(age.value, 16, 120, "age");

      if (password !== confirmPassword) throw "Error: passwords do not match";
    } catch (e) {
      setError(e);
      return false;
    }

    try {
      await createNewUserByEmail(
        email,
        password,
        username
      );
    } catch (e) {
      setFBError(e, setError);
    }
  };

  if (currentUser) {
    return <Navigate to="/"/>;
  } else {
    return (
      <>
        <h1>Create a New Account</h1>
        <form className="auth-form" onSubmit={handleSignUp}>
          <label htmlFor="username">Username</label>
          <input name="username" id="username" type="text" placeholder="Username (6-30 chars)" required />

          <label htmlFor="email">Email</label>
          <input name="email" id="email" type="email" placeholder="Email" required />

          <label htmlFor="password">Password</label>
          <input name="password" id="password" type="password" 
            placeholder="Password must be 8-32 characters and contain 1 uppercase letter, 1 lowercase letter, 1 number, 1 special character and no spaces" required />

          <label htmlFor="confirmPassword">Confirm Password</label>
          <input name="confirmPassword" id="confirmPassword" type="password" placeholder="Retype Password" required />

          <label htmlFor="age">Age</label>
          <input name="age" type="number" min="16" max="120" placeholder="Age (16+)" required />

          {error && <p className='auth-error'>{error}</p>}

          <div className="btn-shelf">
            <button className="auth-btn" type="submit">Create a New Account</button>
            <Link to="/login" className="auth-btn">Log in Instead</Link>
            <GoogleLogin setError={setError} />
          </div>
        </form>
      </>
    );
  }
}

export default SignUp;