import { Link } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import './styles/hostquiz.css';


function HostQuiz(){
  const {currentUser} = useContext(AuthContext);

  return (
    <div className="host-container">
        <div className="top-bar">
            <div className="login">
                {currentUser ? 

                (
                <Link className="login-text" to='/signout'>Sign Out</Link>
                ) : 

                (
                <Link className="login-text" to='/login'>Log In</Link>
                )
                }
            </div>
            <Link className="host-home" to="/">Home</Link>
        </div>
        <div className="host-buttons">
            <Link to="/my-quizzes" className="host-my">My Quizzes</Link>
            <br></br>
            <Link to ="/create-quiz" className="host-create">Create Quiz</Link>
            <br></br>
            <Link to="/search" className="host-search">Search Quizzes</Link>
        </div>
    </div>
  );
}

export default HostQuiz;