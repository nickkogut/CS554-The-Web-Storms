import { Link } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import "./styles/dashboard.css"
import LogInButton from "./auth/LogInButton";
import LogOutButton from "./auth/LogOutButton";

function FormSearch(e){
    e.preventDefault();
    console.log("Searched")
}

function Dashboard(){
  const {currentUser} = useContext(AuthContext);

  return (
    <div className="container">
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
            {/* <form onSubmit={FormSearch} className="submit-form">
                <input  className="submit-text" type="text" placeholder="Search for quiz"></input>
                <button className="submit-button" type="submit">Search</button>
            </form> */}
        </div>

        <br></br>
        <div className="dash-buttons">
        <Link to="/join" className="join">Join Quiz</Link>
        <br></br>
        <Link to ="/host" className="host">Host Quiz</Link>
        </div>
        <br></br>
    </div>
  );
}

export default Dashboard;