import { Link, useNavigate } from "react-router-dom";
import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { gameSocket } from "../gameSocket";
import "./styles/joinquiz.css"

function EnterPIN(e){
    e.preventDefault();
    console.log("pin entered")
}

function JoinQuiz(){
  const {currentUser} = useContext(AuthContext);
  const [pin, setPin] = useState("");
  cosnt [playerName, setPlayerName] = useState(
    currentUser?.displayName || ""
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function EnterPIN(e){
    e.preventDefault();
    setError("");
    const cleanedPin = pin.trim();
    const cleanedName = (playerName || currentUser?.displayName || currentUser?.email || "").trim();
    if(!cleanedPin){
        setError("Please enter a PIN");
        return;
    }
    if(!cleanedName){
        setError("Please enter a player name");
        return;
    }
    setLoading(true);
    if(!gameSocket.connected){
        gameSocket.connect();
    }
    gameSocket.emit(
        'join_room',
        {
            pin: cleanedPin,
            name: cleanedName
        },
        (response) => {
            setLoading(false);
            if(!response?.ok){
                setError(response?.error || "Could not join room");
                return;
            }
            navigate(`/play/${response.roomId}?playerId=${response.playerId}`);
        }
    );
}

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
                <input
                    className="pin-input"
                    type="text"
                    placeholder="Player Name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                ></input>
                <input
                    className="pin-input"
                    type="text"
                    placeholder="PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                ></input>
                <button className="pin-button" type="submit" disabled={loading}>
                    {loading ? "Joining..." : "Join Quiz"}
                </button>
                {error ? <p className="join-error">{error}</p> : null}
            </form>
        </div>
    </div>
  );
}

export default JoinQuiz;