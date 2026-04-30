import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
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
import HostQuiz from './components/HostQuiz.jsx';
import Mailbox from './components/Mailbox.jsx';
import WaitingRoomDemo from './components/WaitingRoomDemo';
import WaitingRoom from './components/WaitingRoom.jsx';
import HostRoom from './components/HostRoom.jsx';
import PlayerGame from './components/PlayerGame.jsx';

import QuizCatalog from './components/QuizCatalog.jsx';
import DEBUGfriends from './components/DEBUGfriends.jsx';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path='/' element={<Dashboard />} />
        <Route path='/create-quiz' element={<ModeratorPage />} />
        <Route path='/login' element={<Login />} />
        <Route path='/signup' element={<SignUp />} />

        <Route path='/leaderboard' element={<Leaderboard />} />

        
        <Route path='/join' element={<JoinQuiz />} />
        <Route path='/host' element={<HostQuiz />} />

        <Route path='/change-password' element={<PrivateRoute />} />
        <Route path='/change-password' element={<ChangePassword />} />

        <Route path='/search-quizzes' element={<QuizCatalog />} />
        <Route path='/waiting-demo' element={<WaitingRoomDemo />} />
        <Route path='/play/:roomId' element = {<PlayerGame/>}/>
        <Route path='/host-room/:roomId' element={<HostRoom/>}/>

        <Route path='/test-friends' element={<DEBUGfriends/>} />

      <Route path="*" element={<Navigate to="/" replace={true} />} />

      </Routes>
    </AuthProvider>
  );
}

export default App;