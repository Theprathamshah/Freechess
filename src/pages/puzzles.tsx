import Head from "next/head";
import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Box,
  Grid2 as Grid,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Stack,
  Chip,
  LinearProgress,
} from "@mui/material";
import { Icon } from "@iconify/react";
import { useAtomValue } from "jotai";
import { Chessboard } from "react-chessboard";
import { CustomPieces, Piece } from "react-chessboard/dist/chessboard/types";
import { usePuzzleTrainer } from "@/hooks/usePuzzleTrainer";
import { boardThemeAtom, pieceSetAtom } from "@/components/board/states";
import { BOARD_THEMES } from "@/constants";
import { PageTitle } from "@/components/pageTitle";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const GOLD = "#c9a227";

const PIECE_CODES = [
  "wP", "wB", "wN", "wR", "wQ", "wK",
  "bP", "bB", "bN", "bR", "bQ", "bK",
] as const satisfies Piece[];

export default function PuzzlesPage() {
  const [mounted, setMounted] = useState(false);
  
  const {
    isReady,
    currentPuzzle,
    chessGame,
    status,
    ratingChange,
    userRating,
    solvedCount,
    history,
    makeMove,
    showSolution,
    resetPuzzle,
    skipPuzzle,
  } = usePuzzleTrainer();

  // Read global pieces / themes selections so puzzles feel integrated
  const pieceSet = useAtomValue(pieceSetAtom);
  const boardThemeName = useAtomValue(boardThemeAtom);
  const boardTheme = BOARD_THEMES.find((t) => t.name === boardThemeName) || BOARD_THEMES[0];

  useEffect(() => {
    setMounted(true);
  }, []);

  const orientation = useMemo(() => {
    if (!currentPuzzle) return "white";
    // If starting FEN has " b ", it means Black played the setup move and it's White's turn
    return currentPuzzle.fen.includes(" b ") ? "white" : "black";
  }, [currentPuzzle]);

  const customPieces = useMemo(
    () =>
      PIECE_CODES.reduce<CustomPieces>((acc, piece) => {
        acc[piece] = ({ squareWidth }) => (
          <Box
            width={squareWidth}
            height={squareWidth}
            sx={{
              backgroundImage: `url(/piece/${pieceSet}/${piece}.svg)`,
              backgroundSize: "contain",
            }}
          />
        );
        return acc;
      }, {}),
    [pieceSet]
  );

  const customLightSquareStyle = useMemo(
    () => ({ backgroundColor: boardTheme.lightSquare }),
    [boardTheme]
  );

  const customDarkSquareStyle = useMemo(
    () => ({ backgroundColor: boardTheme.darkSquare }),
    [boardTheme]
  );

  const onPieceDrop = useCallback((source: string, target: string, piece: string): boolean => {
    return makeMove(source, target, piece[1]?.toLowerCase() ?? "q");
  }, [makeMove]);

  // Statistics Computations
  const stats = useMemo(() => {
    const counts = {
      Tactics: { solved: 0, total: 0 },
      Mate: { solved: 0, total: 0 },
      Endgame: { solved: 0, total: 0 },
    };

    history.forEach((h) => {
      // Find theme from active puzzle list
      // In a real database we would lookup the puzzle's details
      // Here we match against static puzzles
      const solvedPuzzleId = h.puzzleId;
      // We can infer theme or query from PUZZLES
      // Let's search inside PUZZLES list
      const matched = h.puzzleId ? PUZZLES_MAP[solvedPuzzleId] : null;
      if (matched) {
        counts[matched.theme].total++;
        if (h.success) counts[matched.theme].solved++;
      }
    });

    return counts;
  }, [history]);

  const chartData = useMemo(() => {
    if (history.length === 0) return [];
    return history.map((h, i) => ({
      index: i + 1,
      rating: h.rating,
      result: h.success ? "Solved" : "Failed",
    }));
  }, [history]);

  if (!mounted || !isReady) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress color="primary" />
      </Box>
    );
  }

  return (
    <>
      <Head>
        <title>Chess Puzzles Trainer | Freechess</title>
        <meta
          name="description"
          content="Train your chess tactics and calculation skills with our free puzzle dashboard and progression trainer."
        />
      </Head>

      <PageTitle title="Tactical Puzzles Trainer" />

      <Grid container spacing={4} sx={{ mt: 2, px: { xs: 1, md: 4 } }} justifyContent="center">
        {/* --- LEFT PANEL: Chessboard Area --- */}
        <Grid size={{ xs: 12, lg: 6 }} display="flex" flexDirection="column" alignItems="center">
          <Paper
            elevation={4}
            sx={{
              p: 3,
              width: "100%",
              maxWidth: "580px",
              borderRadius: 3,
              border: "1px solid rgba(201,162,39,0.2)",
              bgcolor: "background.paper",
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            }}
          >
            {/* Header / Instructions */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  {currentPuzzle?.title || "Puzzle"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {currentPuzzle ? `Difficulty: ${currentPuzzle.rating} Elo` : ""}
                </Typography>
              </Box>
              <Chip
                label={currentPuzzle?.theme}
                color="secondary"
                size="small"
                sx={{
                  bgcolor: "rgba(74, 158, 255, 0.12)",
                  color: "#4a9eff",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  border: "1px solid rgba(74, 158, 255, 0.3)",
                }}
              />
            </Box>

            {/* Chessboard Container */}
            <Box
              sx={{
                width: "100%",
                aspectRatio: "1",
                maxWidth: "540px",
                position: "relative",
                borderRadius: 1,
                overflow: "hidden",
                boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
              }}
            >
              {chessGame && (
                <Chessboard
                  id="puzzle-board"
                  position={chessGame.fen()}
                  onPieceDrop={onPieceDrop}
                  boardOrientation={orientation}
                  customLightSquareStyle={customLightSquareStyle}
                  customDarkSquareStyle={customDarkSquareStyle}
                  customPieces={customPieces}
                  customBoardStyle={{
                    borderRadius: "5px",
                  }}
                />
              )}
            </Box>

            {/* Turn Clue / Feedback */}
            <Box sx={{ mt: 3, minHeight: "56px" }}>
              {status === "playing" && (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    bgcolor: "rgba(255,255,255,0.02)",
                    borderColor: "rgba(255,255,255,0.06)",
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                  }}
                >
                  <Icon icon="mdi:chess-pawn" color={GOLD} height={20} />
                  <Typography variant="body2" fontWeight={500}>
                    {orientation === "white" ? "White" : "Black"} to move. {currentPuzzle?.description}
                  </Typography>
                </Paper>
              )}

              {status === "correct_step" && (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    bgcolor: "rgba(46, 125, 50, 0.1)",
                    borderColor: "rgba(46, 125, 50, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                  }}
                >
                  <CircularProgress size={16} color="success" />
                  <Typography variant="body2" color="success.main" fontWeight={600}>
                    Correct! Opponent is responding...
                  </Typography>
                </Paper>
              )}

              {status === "solved" && (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    bgcolor: "rgba(46, 125, 50, 0.15)",
                    borderColor: "rgba(46, 125, 50, 0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Icon icon="mdi:check-decagram" color="#2e7d32" height={24} />
                    <Box>
                      <Typography variant="body2" color="success.main" fontWeight={700}>
                        Puzzle Solved!
                      </Typography>
                      {ratingChange !== null && (
                        <Typography variant="caption" color="text.secondary">
                          Rating: {userRating} ({ratingChange >= 0 ? `+${ratingChange}` : ratingChange})
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={skipPuzzle}
                    sx={{ px: 3, fontWeight: 700 }}
                  >
                    Next Puzzle
                  </Button>
                </Paper>
              )}

              {status === "failed" && (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    bgcolor: "rgba(211, 47, 47, 0.15)",
                    borderColor: "rgba(211, 47, 47, 0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Icon icon="mdi:close-circle" color="#d32f2f" height={24} />
                    <Box>
                      <Typography variant="body2" color="error.main" fontWeight={700}>
                        That is incorrect!
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Try a different move, reset, or view solution.
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={resetPuzzle}
                    sx={{ px: 2, fontWeight: 600, textTransform: "none" }}
                  >
                    Try Again
                  </Button>
                </Paper>
              )}
            </Box>

            {/* Action Buttons */}
            <Stack direction="row" spacing={1.5} sx={{ mt: 3 }} width="100%">
              <Button
                variant="outlined"
                color="inherit"
                fullWidth
                onClick={resetPuzzle}
                startIcon={<Icon icon="mdi:restore" />}
                sx={{ textTransform: "none", borderColor: "rgba(255,255,255,0.12)" }}
              >
                Reset
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                fullWidth
                onClick={showSolution}
                startIcon={<Icon icon="mdi:eye-outline" />}
                sx={{ textTransform: "none", borderColor: "rgba(255,255,255,0.12)" }}
              >
                Show Solution
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                fullWidth
                onClick={skipPuzzle}
                startIcon={<Icon icon="mdi:skip-next" />}
                sx={{ textTransform: "none", borderColor: "rgba(255,255,255,0.12)" }}
              >
                Skip
              </Button>
            </Stack>
          </Paper>
        </Grid>

        {/* --- RIGHT PANEL: Dashboard & Progression --- */}
        <Grid size={{ xs: 12, lg: 5 }} spacing={3} display="flex" flexDirection="column">
          {/* Card 1: Main Stats */}
          <Paper
            elevation={4}
            sx={{
              p: 3,
              borderRadius: 3,
              border: "1px solid rgba(255,255,255,0.06)",
              bgcolor: "background.paper",
            }}
          >
          <Typography variant="subtitle2" color="text.secondary" fontWeight={600} gutterBottom sx={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Your Performance
          </Typography>

            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={4} textAlign="center">
                <Typography variant="h4" fontWeight={800} color={GOLD}>
                  {userRating}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Puzzle Elo
                </Typography>
              </Grid>
              <Grid size={4} textAlign="center">
                <Typography variant="h4" fontWeight={800}>
                  {solvedCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Puzzles Solved
                </Typography>
              </Grid>
              <Grid size={4} textAlign="center">
                <Typography variant="h4" fontWeight={800}>
                  {history.length > 0
                    ? `${Math.round(
                        (history.filter((h) => h.success).length / history.length) * 100
                      )}%`
                    : "0%"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Solve Ratio
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Card 2: Rating progression graph */}
          <Paper
            elevation={4}
            sx={{
              p: 3,
              borderRadius: 3,
              border: "1px solid rgba(255,255,255,0.06)",
              bgcolor: "background.paper",
              minHeight: "260px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Typography variant="subtitle2" color="text.secondary" fontWeight={600} gutterBottom sx={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Rating Progression
            </Typography>

            {chartData.length === 0 ? (
              <Box flexGrow={1} display="flex" flexDirection="column" justifyContent="center" alignItems="center" sx={{ py: 4, opacity: 0.3 }}>
                <Icon icon="mdi:chart-line" height={48} />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Solve puzzles to plot your progression!
                </Typography>
              </Box>
            ) : (
              <Box sx={{ width: "100%", height: 180, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="index" hide />
                    <YAxis domain={["dataMin - 50", "dataMax + 50"]} stroke="rgba(255,255,255,0.3)" style={{ fontSize: "0.75rem" }} />
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <Paper sx={{ p: 1.5, border: `1px solid ${GOLD}`, borderRadius: 2, bgcolor: "#1e1e20" }}>
                              <Typography variant="body2" fontWeight={700} color={GOLD}>
                                Rating: {data.rating}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Attempt {data.index} · {data.result}
                              </Typography>
                            </Paper>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="rating"
                      stroke={GOLD}
                      strokeWidth={3}
                      dot={{ r: 4, stroke: "#0d0d0f", strokeWidth: 1 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Paper>

          {/* Card 3: Solve Stats by Theme */}
          <Paper
            elevation={4}
            sx={{
              p: 3,
              borderRadius: 3,
              border: "1px solid rgba(255,255,255,0.06)",
              bgcolor: "background.paper",
            }}
          >
            <Typography variant="subtitle2" color="text.secondary" fontWeight={600} gutterBottom sx={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Theme Strengths
            </Typography>

            <Stack spacing={2.5} sx={{ mt: 2 }}>
              {/* Tactics */}
              <Box>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="body2" fontWeight={600}>
                    Tactics
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {stats.Tactics.solved}/{stats.Tactics.total} solved
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={
                    stats.Tactics.total > 0
                      ? (stats.Tactics.solved / stats.Tactics.total) * 100
                      : 0
                  }
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: "rgba(255,255,255,0.05)",
                    "& .MuiLinearProgress-bar": { borderRadius: 4, bgcolor: GOLD },
                  }}
                />
              </Box>

              {/* Mate */}
              <Box>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="body2" fontWeight={600}>
                    Mate Solutions
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {stats.Mate.solved}/{stats.Mate.total} solved
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={
                    stats.Mate.total > 0
                      ? (stats.Mate.solved / stats.Mate.total) * 100
                      : 0
                  }
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: "rgba(255,255,255,0.05)",
                    "& .MuiLinearProgress-bar": { borderRadius: 4, bgcolor: GOLD },
                  }}
                />
              </Box>

              {/* Endgame */}
              <Box>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="body2" fontWeight={600}>
                    Endgames
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {stats.Endgame.solved}/{stats.Endgame.total} solved
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={
                    stats.Endgame.total > 0
                      ? (stats.Endgame.solved / stats.Endgame.total) * 100
                      : 0
                  }
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: "rgba(255,255,255,0.05)",
                    "& .MuiLinearProgress-bar": { borderRadius: 4, bgcolor: GOLD },
                  }}
                />
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </>
  );
}

// Quick map for fast theme lookup from history records
import { Puzzle as TypePuzzle, PUZZLES } from "../data/puzzles";
const PUZZLES_MAP: Record<string, TypePuzzle> = PUZZLES.reduce<Record<string, TypePuzzle>>((acc, curr) => {
  acc[curr.id] = curr;
  return acc;
}, {});
