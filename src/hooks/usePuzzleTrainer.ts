import { useState, useEffect, useCallback, useRef } from "react";
import { Chess } from "chess.js";
import { Puzzle, PUZZLES } from "../data/puzzles";
import { useLocalStorage } from "./useLocalStorage";

export type PuzzleStatus = "playing" | "correct_step" | "solved" | "failed";

export interface RatingHistoryEntry {
  puzzleId: string;
  rating: number;
  date: string;
  success: boolean;
}

export const usePuzzleTrainer = () => {
  // --- Local Storage state ---
  const [userRating, setUserRating] = useLocalStorage<number>("puzzle_user_rating", 1200);
  const [solvedPuzzles, setSolvedPuzzles] = useLocalStorage<string[]>("puzzle_solved_list", []);
  const [history, setHistory] = useLocalStorage<RatingHistoryEntry[]>("puzzle_rating_history", []);

  // --- Live hook state ---
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [chessGame, setChessGame] = useState<Chess | null>(null);
  const [moveIndex, setMoveIndex] = useState<number>(0);
  const [status, setStatus] = useState<PuzzleStatus>("playing");
  const [ratingChange, setRatingChange] = useState<number | null>(null);
  const [isClientReady, setIsClientReady] = useState(false);

  // Use a ref to keep track of current values in callbacks without re-binding
  const solvedPuzzlesRef = useRef<string[]>([]);
  const userRatingRef = useRef<number>(1200);
  const historyRef = useRef<RatingHistoryEntry[]>([]);

  useEffect(() => {
    if (solvedPuzzles !== null) solvedPuzzlesRef.current = solvedPuzzles;
  }, [solvedPuzzles]);

  useEffect(() => {
    if (userRating !== null) userRatingRef.current = userRating;
  }, [userRating]);

  useEffect(() => {
    if (history !== null) historyRef.current = history;
  }, [history]);

  useEffect(() => {
    setIsClientReady(true);
  }, []);

  // Select next puzzle based on current rating and solve list
  const selectNextPuzzle = useCallback(() => {
    if (PUZZLES.length === 0) return;

    const currentRating = userRatingRef.current;
    const solved = solvedPuzzlesRef.current;

    // Filter unsolved puzzles
    let pool = PUZZLES.filter((p) => !solved.includes(p.id));

    // If all solved, reset and choose from all puzzles
    if (pool.length === 0) {
      pool = PUZZLES;
    }

    // Sort by rating closeness to user rating
    pool.sort((a, b) => Math.abs(a.rating - currentRating) - Math.abs(b.rating - currentRating));

    // Pick from the top 3 closest to User Rating to add variety
    const selectionRange = Math.min(pool.length, 3);
    const chosenIndex = Math.floor(Math.random() * selectionRange);
    const puzzle = pool[chosenIndex];

    if (puzzle) {
      const game = new Chess(puzzle.fen);
      // Play the first move automatically (opponent's setup move)
      const firstMove = puzzle.moves[0];
      try {
        game.move(firstMove);
      } catch (err) {
        // Fallback if move is invalid in SAN/UCI
        console.error("Failed to execute setup move", firstMove, err);
      }

      setCurrentPuzzle(puzzle);
      setChessGame(game);
      setMoveIndex(1); // Solution starts at index 1
      setStatus("playing");
      setRatingChange(null);
    }
  }, []);

  // Set initial puzzle once client is ready and local storage is resolved
  useEffect(() => {
    if (isClientReady && userRating !== null && solvedPuzzles !== null && !currentPuzzle) {
      selectNextPuzzle();
    }
  }, [isClientReady, userRating, solvedPuzzles, currentPuzzle, selectNextPuzzle]);

  // Handle rating adjustment on success/fail
  const adjustRating = useCallback((success: boolean, puzzle: Puzzle) => {
    if (userRating === null) return;

    const currentRating = userRatingRef.current;
    const K = 32;
    const expected = 1 / (1 + Math.pow(10, (puzzle.rating - currentRating) / 400));
    const actual = success ? 1 : 0;
    const change = Math.round(K * (actual - expected));

    // Cap minimum change for reward / penalty
    const finalChange = change === 0 ? (success ? 2 : -2) : change;
    const newRating = Math.max(100, currentRating + finalChange);

    setUserRating(newRating);
    setRatingChange(finalChange);

    // Save history
    const historyEntry: RatingHistoryEntry = {
      puzzleId: puzzle.id,
      rating: newRating,
      date: new Date().toLocaleDateString(),
      success,
    };
    if (history !== null) {
      setHistory([...historyRef.current, historyEntry]);
    } else {
      setHistory([historyEntry]);
    }

    // Save to solved list on success
    if (success && solvedPuzzles !== null) {
      if (!solvedPuzzlesRef.current.includes(puzzle.id)) {
        setSolvedPuzzles([...solvedPuzzlesRef.current, puzzle.id]);
      }
    }
  }, [userRating, history, solvedPuzzles, setHistory, setSolvedPuzzles, setUserRating]);

  // Attempt a move
  const makeMove = useCallback((from: string, to: string, promotion?: string): boolean => {
    if (!chessGame || !currentPuzzle || status === "solved") return false;

    // Build UCI move
    const promo = promotion ? promotion.toLowerCase() : "";
    const uciMove = from + to + promo;

    const expectedMove = currentPuzzle.moves[moveIndex];

    if (uciMove === expectedMove) {
      // Correct move!
      const gameCopy = new Chess(chessGame.fen());
      try {
        gameCopy.move({ from, to, promotion });
        setChessGame(gameCopy);

        const nextIndex = moveIndex + 1;
        if (nextIndex >= currentPuzzle.moves.length) {
          // Fully solved!
          setStatus("solved");
          // Update rating if not already failed
          if (status !== "failed") {
            adjustRating(true, currentPuzzle);
          }
        } else {
          // Play opponent response automatically
          const opponentMove = currentPuzzle.moves[nextIndex];
          setTimeout(() => {
            try {
              gameCopy.move(opponentMove);
              setChessGame(new Chess(gameCopy.fen()));
              setMoveIndex(nextIndex + 1);
              setStatus("correct_step");
              // Reset status back to playing after a small duration to allow user moves
              setTimeout(() => setStatus("playing"), 600);
            } catch (err) {
              console.error("Failed to execute opponent response move", opponentMove, err);
            }
          }, 600);
        }
        return true;
      } catch (err) {
        console.error("Failed to apply player move", uciMove, err);
        return false;
      }
    } else {
      // Wrong move!
      setStatus("failed");
      if (ratingChange === null) {
        adjustRating(false, currentPuzzle);
      }
      return false;
    }
  }, [chessGame, currentPuzzle, moveIndex, status, ratingChange, adjustRating]);

  const showSolution = useCallback(() => {
    if (!chessGame || !currentPuzzle) return;

    const gameCopy = new Chess(chessGame.fen());
    let index = moveIndex;
    while (index < currentPuzzle.moves.length) {
      try {
        gameCopy.move(currentPuzzle.moves[index]);
        index++;
      } catch (err) {
        console.error("Failed to execute solution move step", currentPuzzle.moves[index], err);
        break;
      }
    }
    setChessGame(new Chess(gameCopy.fen()));
    setMoveIndex(currentPuzzle.moves.length);
    setStatus("solved");
  }, [chessGame, currentPuzzle, moveIndex]);

  const resetPuzzle = useCallback(() => {
    if (!currentPuzzle) return;
    const game = new Chess(currentPuzzle.fen);
    try {
      game.move(currentPuzzle.moves[0]);
    } catch (err) {
      console.error("Failed to execute setup move on reset", currentPuzzle.moves[0], err);
    }
    setChessGame(game);
    setMoveIndex(1);
    setStatus("playing");
    setRatingChange(null);
  }, [currentPuzzle]);

  const skipPuzzle = useCallback(() => {
    selectNextPuzzle();
  }, [selectNextPuzzle]);

  return {
    isReady: isClientReady && userRating !== null && solvedPuzzles !== null,
    currentPuzzle,
    chessGame,
    status,
    ratingChange,
    userRating: userRating ?? 1200,
    solvedCount: solvedPuzzles?.length ?? 0,
    history: history ?? [],
    makeMove,
    showSolution,
    resetPuzzle,
    skipPuzzle,
  };
};
