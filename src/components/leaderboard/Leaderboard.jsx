import React, { useEffect, useState, useRef } from 'react';
import './leaderboard.css';

// Key used by the game's code to write/read leaderboard data.
const STORAGE_KEY = 'quiz_leaderboard';

export default function Leaderboard() {

  const [entries, setEntries] = useState([]);
  const lastRawRef = useRef(null);  // keep previous raw JSON string to detect changes

  // Sample data for now
  const SAMPLE = [
    { id: 1, name: 'Alice', score: 120 },
    { id: 2, name: 'Bob', score: 90 },
    { id: 3, name: 'Carol', score: 75 },
    { id: 4, name: 'Dan', score: 65 },
    { id: 5, name: 'Eve', score: 50 },
    { id: 6, name: 'Frank', score: 40 }
  ];

  // read stored leaderboard data.
  function readStored() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    if (raw === lastRawRef.current) return null; // returns null when no change
    lastRawRef.current = raw;
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      //sort by highest score
      return parsed.slice().sort((a, b) => b.score - a.score);
    } catch (e) {
      return [];
    }
  }

  useEffect(() => {
    // prefer storage data, use sample otherwise
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        //get top 5 for display purposes
        const sorted = Array.isArray(parsed) ? parsed.slice().sort((a, b) => b.score - a.score) : [];
        setEntries(sorted.slice(0, 5));
        lastRawRef.current = raw;
      } catch (e) {
        setEntries([]);
      }
    } else {
      // default to sample data
      setEntries(SAMPLE.slice(0, 5));
    }

    // event listener for when local storage is modified
    function onStorage(e) {
      if (e.key !== STORAGE_KEY) return;
      const updated = readStored();
      if (updated) setEntries(updated.slice(0, 5));
    }
    window.addEventListener('storage', onStorage);

    // TODO:
    // event listner for when a question ends. 
    // game code should dispatch questionOver event and
    // include the new scores in 'event.detail' or write them to local storage. 
    //
    // for example
    //   localStorage.setItem('quiz_leaderboard', JSON.stringify(newScores));
    //   window.dispatchEvent(new CustomEvent('questionOver', { detail: newScores }));
    function onQuestionOver(e) {
      const detail = e?.detail;
      if (Array.isArray(detail)) {
        lastRawRef.current = JSON.stringify(detail);
        const sorted = detail.slice().sort((a, b) => b.score - a.score);
        setEntries(sorted.slice(0, 5));
        return;
      }
      const updated = readStored();
      if (updated) setEntries(updated.slice(0, 5));
    }
    window.addEventListener('questionOver', onQuestionOver);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('questionOver', onQuestionOver);
    };
  }, []);

  return (
    <div className="leaderboard-root">
      <h2 className="leaderboard-title">Leaderboard</h2>

      <div className="leaderboard-list">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan="3" className="leaderboard-empty">No scores yet</td>
              </tr>
            )}
            {entries.map((e, idx) => (
              <tr key={e.id ?? idx} className={idx === 0 ? 'top' : ''}>
                <td>{idx + 1}</td>
                <td className="player-name">{e.name}</td>
                <td className="player-score">{e.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
