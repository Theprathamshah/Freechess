import { Button } from "@mui/material";
import { useState } from "react";
import GameSettingsDialog from "./gameSettingsDialog";
import { gameAtom } from "../states";
import { useAtomValue } from "jotai";
import { Icon } from "@iconify/react";

export default function GameSettingsButton() {
  const [openDialog, setOpenDialog] = useState(false);
  const game = useAtomValue(gameAtom);
  const hasHistory = game.history().length > 0;

  return (
    <>
      <Button
        variant="contained"
        fullWidth
        onClick={() => setOpenDialog(true)}
        startIcon={<Icon icon={hasHistory ? "mdi:refresh" : "mdi:play-circle-outline"} height={20} />}
        sx={{
          py: 1.3,
          fontSize: "0.95rem",
          fontWeight: 700,
          letterSpacing: "0.04em",
          borderRadius: 2,
          boxShadow: "0 0 20px rgba(201,162,39,0.25)",
          "&:hover": {
            boxShadow: "0 0 28px rgba(201,162,39,0.4)",
            transform: "translateY(-1px)",
          },
          transition: "all 0.2s ease",
        }}
      >
        {hasHistory ? "Start New Game" : "Start Game"}
      </Button>

      <GameSettingsDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
      />
    </>
  );
}
