import { Link } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import "./styles/joinquiz.css"
import LogInButton from "./auth/LogInButton";
import LogOutButton from "./auth/LogOutButton";

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
                <LogOutButton/>
                ) : 

                (
                <LogInButton/>
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