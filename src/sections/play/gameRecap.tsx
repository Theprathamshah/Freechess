import { useAtomValue } from "jotai";
import { gameAtom, isGameInProgressAtom, playerColorAtom } from "./states";
import { Box, Button, Divider, Typography } from "@mui/material";
import { Color } from "@/types/enums";
import { setGameHeaders } from "@/lib/chess";
import { useGameDatabase } from "@/hooks/useGameDatabase";
import { useRouter } from "next/router";
import { Icon } from "@iconify/react";

const RESULT_ICON: Record<string, string> = {
  win: "mdi:trophy",
  loss: "mdi:chess-king",
  draw: "mdi:handshake",
  resigned: "mdi:flag",
};

export default function GameRecap() {
  const game = useAtomValue(gameAtom);
  const playerColor = useAtomValue(playerColorAtom);
  const isGameInProgress = useAtomValue(isGameInProgressAtom);
  const { addGame } = useGameDatabase();
  const router = useRouter();

  if (isGameInProgress || !game.history().length) return null;

  const getResult = (): { label: string; key: string; color: string } => {
    if (game.isCheckmate()) {
      const winnerColor = game.turn() === "w" ? Color.Black : Color.White;
      const won = winnerColor === playerColor;
      return {
        label: won ? "You won by checkmate!" : "Stockfish won by checkmate",
        key: won ? "win" : "loss",
        color: won ? "#4caf50" : "#ef5350",
      };
    }
    if (game.isInsufficientMaterial())
      return { label: "Draw — insufficient material", key: "draw", color: "#9e9e9e" };
    if (game.isStalemate())
      return { label: "Draw — stalemate", key: "draw", color: "#9e9e9e" };
    if (game.isThreefoldRepetition())
      return { label: "Draw — threefold repetition", key: "draw", color: "#9e9e9e" };
    if (game.isDraw())
      return { label: "Draw — fifty-move rule", key: "draw", color: "#9e9e9e" };
    return { label: "You resigned", key: "resigned", color: "#ef5350" };
  };

  const result = getResult();

  const handleOpenGameAnalysis = async () => {
    const gameToAnalysis = setGameHeaders(game, {
      resigned: !game.isGameOver() ? playerColor : undefined,
    });
    const gameId = await addGame(gameToAnalysis);
    router.push({ pathname: "/", query: { gameId } });
  };

  return (
    <Box sx={{ width: "100%" }}>
      {/* Result card */}
      <Box
        sx={{
          p: 2.5,
          mb: 2,
          borderRadius: 2,
          textAlign: "center",
          border: "1px solid",
          borderColor: `${result.color}33`,
          bgcolor: `${result.color}0d`,
        }}
      >
        <Icon icon={RESULT_ICON[result.key]} height={36} color={result.color} />
        <Typography
          variant="h6"
          fontWeight={700}
          sx={{ mt: 1, color: result.color, lineHeight: 1.3 }}
        >
          {result.label}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
          {Math.ceil(game.history().length / 2)} moves played
        </Typography>
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.06)", mb: 2 }} />

      {/* Actions */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Button
          variant="outlined"
          fullWidth
          onClick={handleOpenGameAnalysis}
          startIcon={<Icon icon="mdi:magnify" height={18} />}
          sx={{
            borderRadius: 2,
            py: 1.2,
            fontWeight: 600,
            borderColor: "rgba(201,162,39,0.4)",
            color: "#c9a227",
            "&:hover": { bgcolor: "rgba(201,162,39,0.08)", borderColor: "rgba(201,162,39,0.6)" },
          }}
        >
          Open in Analysis
        </Button>
      </Box>
    </Box>
  );
}
