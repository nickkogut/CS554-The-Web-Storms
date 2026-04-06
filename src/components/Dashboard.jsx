import { Link } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

function FormSearch(e){
    e.preventDefault();
    console.log("Searched")
}

function Dashboard(){
  const {currentUser} = useContext(AuthContext);

  return (
    <>
        {currentUser ? 

        (
        <Link to='/signout'>Sign Out</Link>
        ) : 

        (
        <Link to='/login'>Log In</Link>
        )
        }
        <br></br>
        <Link>Join Quiz</Link>
        <br></br>
        <Link>Host Quiz</Link>
        <br></br>
        <form onSubmit={FormSearch}>
            <input type="text" placeholder="Search for quiz"></input>
            <button type="submit">Search</button>
        </form>
    </>
  );
}

export default Dashboard;