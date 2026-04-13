import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { gameSocket } from "../gameSocket";
import "./styles/livequiz.css";

function HostRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [question, setQuestion] = useState(null);
  const [questionClosed, setQuestionClosed] = useState(null);
  const [finalResult, setFinalResult] = useState(null);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if(!gameSocket.connected){
      gameSocket.connect();
    }

    function onRoomSnapshot(snapshot){
      setRoom(snapshot);
    }

    function onQuestionStarted(payload){
      setQuestion(payload);
      setQuestionClosed(null);
      setFinalResult(null);
    }

    function onQuestionClosed(payload){
      setQuestionClosed(payload);
    }

    function onQuizFinished(payload){
      setFinalResult(payload);
      localStorage.setItem('quiz_leaderboard', JSON.stringify(payload.leaderboard));
      window.dispatchEvent(
        new CustomEvent('questionOver', { detail: payload.leaderboard })
      );
    }

    gameSocket.on('room_snapshot', onRoomSnapshot);
    gameSocket.on('question_started', onQuestionStarted);
    gameSocket.on('question_closed', onQuestionClosed);
    gameSocket.on('quiz_finished', onQuizFinished);

    gameSocket.emit('watch_room', { roomId }, (response) => {
      if(!response?.ok){
        setError(response?.error || "Could not load room");
        return;
      }

      setRoom(response.room);
    });

    return () => {
      gameSocket.off('room_snapshot', onRoomSnapshot);
      gameSocket.off('question_started', onQuestionStarted);
      gameSocket.off('question_closed', onQuestionClosed);
      gameSocket.off('quiz_finished', onQuizFinished);
    };
  }, [roomId]);

  useEffect(() => {
    const timer = setInterval(() => {
      if(!room?.questionEndsAt){
        setTimeLeft(0);
        return;
      }

      const remaining = Math.max(0, room.questionEndsAt - Date.now());
      setTimeLeft(Math.ceil(remaining / 1000));
    }, 250);

    return () => clearInterval(timer);
  }, [room]);

  const canStart = room?.status === "lobby";
  const canNext =
    room?.status === "review" &&
    room?.currentQuestionIndex < room?.totalQuestions - 1;

  const playerCount = useMemo(() => {
    return room?.players?.length || 0;
  }, [room]);

  function handleStartQuiz(){
    setError("");
    setActionLoading(true);

    gameSocket.emit('start_quiz', { roomId }, (response) => {
      setActionLoading(false);

      if(!response?.ok){
        setError(response?.error || "Could not start quiz");
      }
    });
  }

  function handleNextQuestion(){
    setError("");
    setActionLoading(true);

    gameSocket.emit('next_question', { roomId }, (response) => {
      setActionLoading(false);

      if(!response?.ok){
        setError(response?.error || "Could not load next question");
      }
    });
  }

  function goToLeaderboard(){
    navigate('/leaderboard');
  }

  return (
    <div className="live-container">
      <div className="top-bar">
        <div className="login">
          <Link className="login-text" to="/">Home</Link>
        </div>
        <div className="login">
          <Link className="login-text" to="/create-quiz">Create Quiz</Link>
        </div>
      </div>

      <div className="live-card">
        <h1 className="live-title">Host Room</h1>

        {room ? (
          <>
            <p className="live-text"><strong>PIN:</strong> {room.pin}</p>
            <p className="live-text"><strong>Status:</strong> {room.status}</p>
            <p className="live-text"><strong>Players Joined:</strong> {playerCount}</p>

            {room.status === 'question' ? (
              <p className="live-text"><strong>Time Left:</strong> {timeLeft}s</p>
            ) : null}

            {error ? <p className="live-error">{error}</p> : null}

            {canStart ? (
              <button
                type="button"
                className="live-main-button"
                onClick={handleStartQuiz}
                disabled={actionLoading}
              >
                {actionLoading ? 'Starting...' : 'Start Quiz'}
              </button>
            ) : null}

            {canNext ? (
              <button
                type="button"
                className="live-main-button live-secondary-button"
                onClick={handleNextQuestion}
                disabled={actionLoading}
              >
                {actionLoading ? 'Loading...' : 'Next Question'}
              </button>
            ) : null}

            {finalResult ? (
              <button
                type="button"
                className="live-main-button"
                onClick={goToLeaderboard}
              >
                Open Leaderboard
              </button>
            ) : null}
          </>
        ) : (
          <p className="live-text">Loading room...</p>
        )}
      </div>

      {question ? (
        <div className="live-card">
          <h2 className="live-subtitle">
            Question {question.questionIndex + 1} of {question.totalQuestions}
          </h2>
          <p className="live-question">{question.questionText}</p>

          <div className="live-options">
            {question.options.map((option, index) => (
              <div className="live-option-box" key={index}>
                {index + 1}. {option}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {room?.players?.length ? (
        <div className="live-card">
          <h2 className="live-subtitle">Players</h2>

          <div className="live-table-wrapper">
            <table className="live-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Score</th>
                  <th>Connected</th>
                  <th>Answered</th>
                </tr>
              </thead>
              <tbody>
                {room.players.map((player, index) => (
                  <tr key={player.playerId}>
                    <td>{index + 1}</td>
                    <td>{player.name}</td>
                    <td>{player.score}</td>
                    <td>{player.connected ? "Yes" : "No"}</td>
                    <td>{player.answeredCurrentQuestion ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {questionClosed ? (
        <div className="live-card">
          <h2 className="live-subtitle">Round Result</h2>
          <p className="live-text">
            <strong>Correct Option:</strong> Option {questionClosed.correctOption + 1}
          </p>

          <div className="live-table-wrapper">
            <table className="live-table">
              <thead>
                <tr>
                  <th>Option</th>
                  <th>Votes</th>
                </tr>
              </thead>
              <tbody>
                {questionClosed.answerStats.map((count, index) => (
                  <tr key={index}>
                    <td>Option {index + 1}</td>
                    <td>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default HostRoom;