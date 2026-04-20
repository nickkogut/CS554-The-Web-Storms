import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { gameSocket } from "../gameSocket";

function PlayerRoom(){
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const playerId = searchParams.get("playerId");
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [question, setQuestion] = useState(null);
  const [questionClosed, setQuestionClosed] = useState(null);
  const [finalResult, setFinalResult] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if(!playerId){
      setError("Missing player information");
      return;
    }

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
      setSelectedOption(null);
      setSubmitted(false);
      setError("");
    }

    function onQuestionClosed(payload){
      setQuestionClosed(payload);
      setSubmitted(true);
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

    gameSocket.emit('player_reconnect', { roomId, playerId }, (response) => {
      if(!response?.ok){
        setError(response?.error || "Could not reconnect to room");
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
  }, [roomId, playerId]);

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

  const me = useMemo(() => {
    return room?.players?.find((player) => player.playerId === playerId) || null;
  }, [room, playerId]);

  function submitAnswer(){
    setError("");

    if(!question){
      setError("No active question");
      return;
    }

    if(selectedOption === null){
      setError("Please choose an option");
      return;
    }

    if(submitted){
      setError("You already answered this question");
      return;
    }

    gameSocket.emit(
      'submit_answer',
      {
        roomId,
        playerId,
        questionIndex: question.questionIndex,
        selectedOption
      },
      (response) => {
        if(!response?.ok){
          setError(response?.error || "Could not submit answer");
          return;
        }

        setSubmitted(true);
      }
    );
  }

  function openLeaderboard(){
    navigate('/leaderboard');
  }

  return (
    <div className="live-container">
      <div className="top-bar">
        <div className="login">
          <Link className="login-text" to="/">Home</Link>
        </div>
      </div>

      <div className="live-card">
        <h1 className="live-title">Player Room</h1>

        {room ? (
          <>
            <p className="live-text"><strong>PIN:</strong> {room.pin}</p>
            <p className="live-text"><strong>Status:</strong> {room.status}</p>
            <p className="live-text"><strong>Your Score:</strong> {me ? me.score : 0}</p>
            {room.status === 'question' ? (
              <p className="live-text"><strong>Time Left:</strong> {timeLeft}s</p>
            ) : null}
          </>
        ) : (
          <p className="live-text">Connecting...</p>
        )}

        {error ? <p className="live-error">{error}</p> : null}
      </div>

      {question ? (
        <div className="live-card">
          <h2 className="live-subtitle">
            Question {question.questionIndex + 1} of {question.totalQuestions}
          </h2>
          <p className="live-question">{question.questionText}</p>

          <div className="live-options">
            {question.options.map((option, index) => (
              <button
                type="button"
                key={index}
                className={
                  selectedOption === index
                    ? "live-answer-button live-answer-selected"
                    : "live-answer-button"
                }
                onClick={() => {
                  if(!submitted){
                    setSelectedOption(index);
                  }
                }}
                disabled={submitted}
              >
                {index + 1}. {option}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="live-main-button"
            onClick={submitAnswer}
            disabled={submitted}
          >
            {submitted ? "Answer Submitted" : "Submit Answer"}
          </button>
        </div>
      ) : null}

      {questionClosed ? (
        <div className="live-card">
          <h2 className="live-subtitle">Round Result</h2>
          <p className="live-text">
            <strong>Correct Option:</strong> Option {questionClosed.correctOption + 1}
          </p>
          <p className="live-text">
            {selectedOption === questionClosed.correctOption
              ? "You got it right."
              : "You got it wrong."}
          </p>
        </div>
      ) : null}

      {room?.leaderboard?.length ? (
        <div className="live-card">
          <h2 className="live-subtitle">Live Leaderboard</h2>

          <div className="live-table-wrapper">
            <table className="live-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {room.leaderboard.map((player) => (
                  <tr key={player.playerId}>
                    <td>{player.rank}</td>
                    <td>{player.name}</td>
                    <td>{player.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {finalResult ? (
        <div className="live-card">
          <h2 className="live-subtitle">Quiz Finished</h2>
          <button
            type="button"
            className="live-main-button"
            onClick={openLeaderboard}
          >
            Open Final Leaderboard
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default PlayerRoom;