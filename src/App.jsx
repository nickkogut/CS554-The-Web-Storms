import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/auth/PrivateRoute';
import Login from './components/auth/Login';
import SignUp from './components/auth/SignUp';
import ChangePassword from './components/auth/ChangePassword';
import LogOut from './components/auth/LogOut';
import Leaderboard from './components/leaderboard/Leaderboard';
import Dashboard from './components/Dashboard.jsx';
import JoinQuiz from './components/JoinQuiz.jsx';
import ModeratorPage from './components/ModeratorPage';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path='/moderator' element={<ModeratorPage />}/>

          <Route path='/login' element={<Login/>} />
          <Route path='/signup' element={<SignUp/>} />
          
          <Route path='/leaderboard' element={<Leaderboard/>} />

          <Route path='/' element={<Dashboard/>}/>
          <Route path='/join' element={<JoinQuiz/>}/>
          <Route path='/logout' element={<LogOut />} /> {/* Temporary - This will just be accessed as a button on other pages */}

          <Route path='/change-password' element={<PrivateRoute />}/>
          <Route path='/change-password' element={<ChangePassword />} />

      </Routes>
    </AuthProvider>
  );
}

export default App;