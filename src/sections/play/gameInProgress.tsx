import {
  Box,
  Button,
  Divider,
  Grid2 as Grid,
  LinearProgress,
  Typography,
} from "@mui/material";
import { useAtom, useAtomValue } from "jotai";
import { gameAtom, isGameInProgressAtom } from "./states";
import { useEffect } from "react";
import UndoMoveButton from "./undoMoveButton";
import { Icon } from "@iconify/react";

const GOLD = "#c9a227";

export default function GameInProgress() {
  const game = useAtomValue(gameAtom);
  const [isGameInProgress, setIsGameInProgress] = useAtom(isGameInProgressAtom);

  useEffect(() => {
    if (game.isGameOver()) setIsGameInProgress(false);
  }, [game, setIsGameInProgress]);

  const handleResign = () => {
    setIsGameInProgress(false);
  };

  if (!isGameInProgress) return null;

  const moveCount = Math.ceil(game.history().length / 2);

  return (
    <Box sx={{ width: "100%" }}>
      {/* Live indicator */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          mb: 2,
          p: 1.5,
          borderRadius: 2,
          bgcolor: "rgba(76,175,80,0.08)",
          border: "1px solid rgba(76,175,80,0.2)",
        }}
      >
        {/* Pulsing dot */}
        <Box sx={{ position: "relative", display: "flex", alignItems: "center" }}>
          <Box
            sx={{
              width: 8, height: 8, borderRadius: "50%",
              bgcolor: "#4caf50",
              boxShadow: "0 0 0 0 rgba(76,175,80,0.6)",
              animation: "pulse 1.8s ease-in-out infinite",
              "@keyframes pulse": {
                "0%": { boxShadow: "0 0 0 0 rgba(76,175,80,0.6)" },
                "70%": { boxShadow: "0 0 0 8px rgba(76,175,80,0)" },
                "100%": { boxShadow: "0 0 0 0 rgba(76,175,80,0)" },
              },
            }}
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" fontWeight={700} color="success.main">
            Game in progress
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Move {moveCount} · {game.turn() === "w" ? "White" : "Black"} to play
          </Typography>
        </Box>
      </Box>

      {/* Progress bar */}
      <LinearProgress
        variant="indeterminate"
        sx={{
          mb: 2.5, height: 2, borderRadius: 1,
          bgcolor: "rgba(201,162,39,0.08)",
          "& .MuiLinearProgress-bar": { bgcolor: GOLD },
        }}
      />

      <Divider sx={{ borderColor: "rgba(255,255,255,0.06)", mb: 2.5 }} />

      {/* Actions */}
      <Grid container spacing={2} size={12}>
        <Grid size={7}>
          <UndoMoveButton />
        </Grid>
        <Grid size={5}>
          <Button
            variant="outlined"
            fullWidth
            color="error"
            onClick={handleResign}
            startIcon={<Icon icon="mdi:flag-outline" height={16} />}
            sx={{
              borderRadius: 2,
              py: 1.1,
              fontWeight: 600,
              fontSize: "0.85rem",
              "&:hover": { bgcolor: "rgba(239,83,80,0.08)" },
            }}
          >
            Resign
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}
