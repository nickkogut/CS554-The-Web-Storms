import { Link } from "react-router-dom";
import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { gameSocket } from "../gameSocket";
import './styles/hostquiz.css';


function HostQuiz(){
  const {currentUser} = useContext(AuthContext);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const createLiveRoom = () => {
    setError("");
    setLoading(true);
    if(!gameSocket.connected){
      gameSocket.connect();
    }
    const hostName = currentUser?.displayName || currentUser?.email || "Host";
    gameSocket.emit( 'create_room', {
      hostName,
      questionCount: 5
    }, (response) => {
      setLoading(false);
      if(!response?.ok){
        setError(response?.error || "Could not create room");
        return;
      }
      navigate(`/host-room/${response.roomId}`);
    }
  );
};

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
            <button
              type="button"
              className="host-create host-button-reset"
              onClick={createLiveRoom}
              disabled={loading} >
                {loading ? "Creating..." : "Start Live Quiz"}
            </button>
            <br></br>
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