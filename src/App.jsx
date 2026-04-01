import React from 'react';
import {Route, Routes} from 'react-router-dom';
import {AuthProvider} from './context/AuthContext';
import PrivateRoute from './components/auth/PrivateRoute';
import Login from './components/auth/Login';
import SignUp from './components/auth/SignUp';
import ChangePassword from './components/auth/ChangePassword';
import LogOut from './components/auth/LogOut';

function App() {
  return (
    <AuthProvider>
        <Routes>
          <Route path='/change-password' element={<PrivateRoute/>}>
            <Route path='/change-password' element={<ChangePassword/>} />
          </Route>
          
          <Route path='/logout' element={<LogOut/>} /> {/* Temporary - This will just be accessed as a button on other pages */}

          <Route path='/login' element={<Login/>} />
          <Route path='/signup' element={<SignUp/>} />
        </Routes>
    </AuthProvider>
  );
}

export default App;