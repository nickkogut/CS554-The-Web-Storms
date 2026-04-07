import { Link } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import './joinquiz.css';

function EnterPIN(e){
    e.preventDefault();
    console.log("pin entered")
}

function JoinQuiz(){
  const {currentUser} = useContext(AuthContext);

  return (
    <div className="join-container">
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
            <Link className="join-home" to="/">Home</Link>
        </div>
        <div className="pin-section">
            <form onSubmit={EnterPIN} className="pin-form">
                <input  className="pin-input" type="text" placeholder="PIN"></input>
                <button className="pin-button" type="submit">Join Quiz</button>
            </form>
        </div>
    </div>
  );
}

export default JoinQuiz;