import { ResponsiveBar } from "@nivo/bar";
import { Box, Paper, Typography, ToggleButtonGroup, ToggleButton, Stack, Chip, LinearProgress, useTheme } from "@mui/material";
import { useState } from "react";
import { InsightStats, OpeningStat } from "@/hooks/useChessInsights";

interface Props {
  stats: InsightStats;
}

const nivoTheme = {
  background: "transparent",
  text: { fill: "#aaa", fontSize: 11 },
  axis: { ticks: { text: { fill: "#777" } } },
  grid: { line: { stroke: "#2a2a2a" } },
  tooltip: { container: { background: "#1a1a2e", border: "1px solid #333", color: "#fff" } },
};

function OpeningRow({ opening }: { opening: OpeningStat }) {
  const theme = useTheme();
  const winColor = opening.winRate >= 55 ? theme.palette.success.main :
                   opening.winRate >= 45 ? theme.palette.warning.main : theme.palette.error.main;
  return (
    <Box sx={{ py: 1.5, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.8 }}>
        <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: "55%" }}>{opening.name}</Typography>
        <Stack direction="row" spacing={1}>
          <Chip label={`${opening.winRate.toFixed(0)}% wins`} size="small"
            sx={{ bgcolor: `${winColor}22`, color: winColor, fontWeight: 700, fontSize: "0.7rem" }} />
          <Chip label={`${opening.games}g`} size="small" variant="outlined" sx={{ fontSize: "0.7rem" }} />
          <Typography variant="caption" sx={{ alignSelf: "center", color: "text.disabled" }}>
            {opening.avgAccuracy.toFixed(0)}% acc
          </Typography>
        </Stack>
      </Box>
      <Box sx={{ display: "flex", gap: 0.4, height: 6 }}>
        <LinearProgress
          variant="determinate"
          value={(opening.wins / opening.games) * 100}
          sx={{ flex: opening.wins, borderRadius: 1, bgcolor: "transparent",
            "& .MuiLinearProgress-bar": { bgcolor: theme.palette.success.main } }}
        />
        {opening.draws > 0 && (
          <LinearProgress
            variant="determinate"
            value={(opening.draws / opening.games) * 100}
            sx={{ flex: opening.draws, borderRadius: 1, bgcolor: "transparent",
              "& .MuiLinearProgress-bar": { bgcolor: "#777" } }}
          />
        )}
        {opening.losses > 0 && (
          <LinearProgress
            variant="determinate"
            value={(opening.losses / opening.games) * 100}
            sx={{ flex: opening.losses, borderRadius: 1, bgcolor: "transparent",
              "& .MuiLinearProgress-bar": { bgcolor: theme.palette.error.main } }}
          />
        )}
      </Box>
      <Box sx={{ display: "flex", gap: 2, mt: 0.5 }}>
        {[
          { label: "W", v: opening.wins, c: theme.palette.success.main },
          { label: "D", v: opening.draws, c: "#777" },
          { label: "L", v: opening.losses, c: theme.palette.error.main },
        ].map(s => (
          <Typography key={s.label} variant="caption" sx={{ color: s.c, fontWeight: 700 }}>
            {s.label} {s.v}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

export function OpeningsTab({ stats }: Props) {
  const [view, setView] = useState<"white" | "black">("white");
  const openings = view === "white" ? stats.openingsAsWhite : stats.openingsAsBlack;

  const barData = openings.slice(0, 6).map(o => ({
    opening: o.name.length > 20 ? o.name.slice(0, 18) + "…" : o.name,
    Wins: o.wins,
    Draws: o.draws,
    Losses: o.losses,
  }));

  if (stats.openingsAsWhite.length === 0 && stats.openingsAsBlack.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <Typography color="text.secondary" mb={1}>
          No opening data found yet.
        </Typography>
        <Typography variant="caption" color="text.disabled">
          Tip: Make sure your username is set above so games are correctly attributed to White/Black.
          Chess.com and Lichess games include opening names in PGN headers automatically.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h6" fontWeight={700}>Opening Performance</Typography>
        <ToggleButtonGroup
          value={view}
          exclusive
          onChange={(_, v) => v && setView(v)}
          size="small"
        >
          <ToggleButton value="white">
            <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "#fff", border: "1px solid #555", mr: 0.8 }} />
            White
          </ToggleButton>
          <ToggleButton value="black">
            <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "#222", border: "1px solid #555", mr: 0.8 }} />
            Black
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {barData.length > 0 && (
        <Paper sx={{ p: 3, borderRadius: 3, mb: 3, background: "rgba(255,255,255,0.03)" }}>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Games by Opening (Top 6)
          </Typography>
          <Box sx={{ height: 220 }}>
            <ResponsiveBar
              data={barData}
              keys={["Wins", "Draws", "Losses"]}
              indexBy="opening"
              layout="vertical"
              colors={["#4CAF50", "#9E9E9E", "#EF5350"]}
              theme={nivoTheme}
              margin={{ top: 10, right: 20, bottom: 40, left: 10 }}
              padding={0.3}
              axisBottom={{ tickRotation: -15 }}
              axisLeft={null}
              enableLabel={false}
              enableGridY={false}
              legends={[{
                dataFrom: "keys",
                anchor: "top-right",
                direction: "row",
                justify: false,
                translateX: 0,
                translateY: -10,
                itemWidth: 60,
                itemHeight: 14,
                itemsSpacing: 5,
                symbolSize: 10,
              }]}
            />
          </Box>
        </Paper>
      )}

      <Paper sx={{ p: 3, borderRadius: 3, background: "rgba(255,255,255,0.03)" }}>
        <Typography variant="body2" color="text.secondary" mb={1}>
          Detailed Opening Statistics as {view === "white" ? "White ♟♙" : "Black ♟"}
        </Typography>
        {openings.length === 0 ? (
          <Typography color="text.disabled" sx={{ py: 3, textAlign: "center" }}>
            No openings detected for this color.
          </Typography>
        ) : (
          openings.map(o => (
            <OpeningRow key={o.name} opening={o} />
          ))
        )}
      </Paper>
    </Box>
  );
}
