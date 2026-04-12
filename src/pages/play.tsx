import { PageTitle } from "@/components/pageTitle";
import Board from "@/sections/play/board";
import GameInProgress from "@/sections/play/gameInProgress";
import GameRecap from "@/sections/play/gameRecap";
import GameSettingsButton from "@/sections/play/gameSettings/gameSettingsButton";
import { isGameInProgressAtom, engineEloAtom, enginePlayNameAtom, playerColorAtom } from "@/sections/play/states";
import { Grid2 as Grid, Box, Typography, Divider, Stack, Chip } from "@mui/material";
import { useAtomValue } from "jotai";
import { Icon } from "@iconify/react";
import { ENGINE_LABELS } from "@/constants";
import { Color } from "@/types/enums";

const GOLD = "#c9a227";

export default function Play() {
  const isGameInProgress = useAtomValue(isGameInProgressAtom);
  const engineElo = useAtomValue(engineEloAtom);
  const engineName = useAtomValue(enginePlayNameAtom);
  const playerColor = useAtomValue(playerColorAtom);

  return (
    <Grid container gap={4} justifyContent="space-evenly" alignItems="start">
      <PageTitle title="Freechess Play vs Stockfish" />

      <Board />

      <Grid
        container
        justifyContent="start"
        alignItems="center"
        size={{ xs: 12, md: "grow" }}
        sx={{ maxWidth: "400px" }}
      >
        {/* ── Panel card ─── */}
        <Box
          sx={{
            width: "100%",
            borderRadius: 3,
            bgcolor: "background.paper",
            border: "1px solid rgba(201,162,39,0.2)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,162,39,0.06)",
            overflow: "hidden",
          }}
        >
          {/* Header strip */}
          <Box
            sx={{
              px: 3,
              py: 2,
              background: `linear-gradient(135deg, rgba(201,162,39,0.12) 0%, rgba(201,162,39,0.04) 100%)`,
              borderBottom: "1px solid rgba(201,162,39,0.15)",
              display: "flex",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                p: 0.9,
                borderRadius: 1.5,
                background: `linear-gradient(135deg, ${GOLD}, #e8b830)`,
                display: "flex",
                alignItems: "center",
                boxShadow: `0 0 12px rgba(201,162,39,0.3)`,
              }}
            >
              <Icon icon="streamline:chess-pawn" height={20} color="#0d0d0f" />
            </Box>
            <Box>
              <Typography fontWeight={700} fontSize="1rem" letterSpacing="-0.01em">
                Play vs Stockfish
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Local engine · No account needed
              </Typography>
            </Box>
          </Box>

          {/* Body */}
          <Box sx={{ px: 3, py: 2.5 }}>
            {/* Current config summary — shown when NOT in progress */}
            {!isGameInProgress && (
              <Box
                sx={{
                  mb: 2.5,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  sx={{ display: "block", mb: 1.5, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.65rem" }}
                >
                  Current Settings
                </Typography>

                <Stack spacing={1.5}>
                  {/* Engine */}
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Icon icon="mdi:robot" height={16} color={GOLD} />
                      <Typography variant="body2" color="text.secondary">Engine</Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={600}>
                      {ENGINE_LABELS[engineName].small}
                    </Typography>
                  </Box>

                  <Divider sx={{ borderColor: "rgba(255,255,255,0.05)" }} />

                  {/* Elo */}
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Icon icon="mdi:trophy-outline" height={16} color={GOLD} />
                      <Typography variant="body2" color="text.secondary">Bot Elo</Typography>
                    </Box>
                    <Chip
                      label={engineElo}
                      size="small"
                      sx={{
                        bgcolor: "rgba(201,162,39,0.1)",
                        color: GOLD,
                        fontWeight: 700,
                        border: "1px solid rgba(201,162,39,0.3)",
                        fontSize: "0.8rem",
                        height: 24,
                      }}
                    />
                  </Box>

                  <Divider sx={{ borderColor: "rgba(255,255,255,0.05)" }} />

                  {/* Side */}
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Icon icon="mdi:chess-king" height={16} color={GOLD} />
                      <Typography variant="body2" color="text.secondary">You play as</Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                      <Box
                        sx={{
                          width: 14, height: 14, borderRadius: "50%",
                          bgcolor: playerColor === Color.White ? "#fff" : "#111",
                          border: "1.5px solid",
                          borderColor: playerColor === Color.White ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)",
                          boxShadow: playerColor === Color.White ? "0 0 6px rgba(255,255,255,0.3)" : "none",
                        }}
                      />
                      <Typography variant="body2" fontWeight={600}>
                        {playerColor === Color.White ? "White" : "Black"}
                      </Typography>
                    </Box>
                  </Box>
                </Stack>
              </Box>
            )}

            {/* Game in progress info */}
            <GameInProgress />

            {/* Start / new game button */}
            {!isGameInProgress && <GameSettingsButton />}

            {/* Recap after game ends */}
            <GameRecap />
          </Box>

          {/* Footer tip */}
          {!isGameInProgress && (
            <Box
              sx={{
                px: 3,
                py: 1.5,
                borderTop: "1px solid rgba(255,255,255,0.05)",
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Icon icon="mdi:information-outline" height={14} color="rgba(255,255,255,0.3)" />
              <Typography variant="caption" color="text.disabled" fontSize="0.7rem">
                Click <strong style={{ color: GOLD }}>Start Game</strong> to configure engine, ELO & side
              </Typography>
            </Box>
          )}
        </Box>
      </Grid>
    </Grid>
  );
}
