import React, {useContext} from 'react';
import {useNavigate} from 'react-router-dom';
import {logOut} from '../../firebase/FirebaseFunctions';
import './auth.css';

const LogOut = () => {
  const navigate = useNavigate();
  const handleLogOut = async () => {
    await logOut();
    navigate("/");
  }
    return (
      <button className='auth-btn' type='button' onClick={() => handleLogOut()}>Log Out</button>
    );
};

export default LogOut;