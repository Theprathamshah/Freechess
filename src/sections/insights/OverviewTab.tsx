import { ResponsiveLine } from "@nivo/line";
import { ResponsivePie } from "@nivo/pie";
import { Box, Paper, Typography, Grid2 as Grid, Chip, Stack } from "@mui/material";

import { InsightStats } from "@/hooks/useChessInsights";

interface Props {
  stats: InsightStats;
}

const nivoTheme = {
  background: "transparent",
  text: { fill: "#aaa", fontSize: 12 },
  axis: {
    ticks: { text: { fill: "#888" } },
    legend: { text: { fill: "#888" } },
  },
  grid: { line: { stroke: "#333" } },
  tooltip: { container: { background: "#1a1a2e", border: "1px solid #333", color: "#fff" } },
  legends: { text: { fill: "#aaa" } },
};

function ColorBlock({
  color,
  stats,
}: {
  color: "White" | "Black";
  stats: { winRate: number; drawRate: number; lossRate: number; avgAccuracy: number; games: number };
}) {
  const pieData = [
    { id: "Wins", value: stats.winRate, color: "#4CAF50" },
    { id: "Draws", value: stats.drawRate, color: "#9E9E9E" },
    { id: "Losses", value: stats.lossRate, color: "#EF5350" },
  ].filter(d => d.value > 0);

  return (
    <Paper
      sx={{
        p: 2.5, borderRadius: 3, height: "100%",
        background: color === "White" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.35)",
        border: `1px solid ${color === "White" ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)"}`,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <Box sx={{ width: 18, height: 18, borderRadius: "50%", background: color === "White" ? "#fff" : "#1a1a1a", border: "2px solid #555" }} />
        <Typography fontWeight={700} fontSize={18}>As {color}</Typography>
        <Chip label={`${stats.games} games`} size="small" sx={{ ml: "auto !important" }} />
      </Stack>

      <Box sx={{ height: 150 }}>
        <ResponsivePie
          data={pieData}
          innerRadius={0.62}
          padAngle={2}
          cornerRadius={3}
          colors={d => d.data.color}
          enableArcLabels={false}
          enableArcLinkLabels={false}
          theme={nivoTheme}
          tooltip={({ datum }) => (
            <Box sx={{ bgcolor: "#1a1a2e", p: 1, borderRadius: 1, border: "1px solid #333" }}>
              <Typography variant="caption" color="white">
                {datum.id}: {datum.value.toFixed(1)}%
              </Typography>
            </Box>
          )}
        />
      </Box>

      <Grid container spacing={1} mt={1}>
        {[
          { label: "Wins", value: `${stats.winRate.toFixed(0)}%`, color: "#4CAF50" },
          { label: "Draws", value: `${stats.drawRate.toFixed(0)}%`, color: "#9E9E9E" },
          { label: "Losses", value: `${stats.lossRate.toFixed(0)}%`, color: "#EF5350" },
        ].map(s => (
          <Grid key={s.label} size={4} sx={{ textAlign: "center" }}>
            <Typography variant="h6" fontWeight={800} sx={{ color: s.color }}>{s.value}</Typography>
            <Typography variant="caption" color="text.secondary">{s.label}</Typography>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 1.5, pt: 1.5, borderTop: "1px solid rgba(255,255,255,0.08)", textAlign: "center" }}>
        <Typography variant="h5" fontWeight={700} color="primary.main">
          {stats.avgAccuracy.toFixed(1)}%
        </Typography>
        <Typography variant="caption" color="text.secondary">Average Accuracy</Typography>
      </Box>
    </Paper>
  );
}

export function OverviewTab({ stats }: Props) {
  const lineData = [
    {
      id: "White",
      color: "#e0e0e0",
      data: stats.accuracyOverTime.map(d => ({ x: d.gameIndex, y: +d.white.toFixed(1) })),
    },
    {
      id: "Black",
      color: "#78909c",
      data: stats.accuracyOverTime.map(d => ({ x: d.gameIndex, y: +d.black.toFixed(1) })),
    },
  ];

  const terminationData = stats.terminationTypes.slice(0, 6).map((t, i) => ({
    id: t.type,
    value: t.count,
    color: ["#1976d2", "#4CAF50", "#FF9800", "#EF5350", "#9C27B0", "#00BCD4"][i % 6],
  }));

  const totalWins = stats.asWhite.wins + stats.asBlack.wins;
  const totalGames = stats.asWhite.games + stats.asBlack.games;
  const overallWinRate = totalGames > 0 ? (totalWins / totalGames * 100).toFixed(0) : "—";

  return (
    <Box>
      {/* Top stat cards */}
      <Grid container spacing={2.5} mb={3}>
        {[
          { value: `${stats.avgAccuracy.toFixed(1)}%`, label: "Overall Accuracy", color: "primary.main", bg: "rgba(25,118,210,0.08)" },
          { value: `${overallWinRate}%`, label: "Overall Win Rate", color: "success.main", bg: "rgba(76,175,80,0.08)" },
          { value: stats.totalGames, label: "Total Games", color: "secondary.main", bg: "rgba(156,39,176,0.08)" },
          { value: stats.analyzedGames, label: "Analyzed", color: "#FFA726", bg: "rgba(255,152,0,0.08)" },
        ].map(c => (
          <Grid key={c.label} size={{ xs: 6, md: 3 }}>
            <Paper sx={{ p: 2.5, borderRadius: 3, background: c.bg, textAlign: "center", height: "100%" }}>
              <Typography variant="h3" fontWeight={800} sx={{ color: c.color }}>{c.value}</Typography>
              <Typography color="text.secondary" mt={0.5} variant="body2">{c.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* White/Black blocks */}
      <Grid container spacing={2.5} mb={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <ColorBlock color="White" stats={stats.asWhite} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ColorBlock color="Black" stats={stats.asBlack} />
        </Grid>
      </Grid>

      {/* Accuracy over time */}
      {stats.accuracyOverTime.length > 1 && (
        <Paper sx={{ p: 3, borderRadius: 3, mb: 3, background: "rgba(255,255,255,0.03)" }}>
          <Typography variant="h6" fontWeight={700} mb={2}>Accuracy Over Time</Typography>
          <Box sx={{ height: 260 }}>
            <ResponsiveLine
              data={lineData}
              theme={nivoTheme}
              margin={{ top: 10, right: 20, bottom: 40, left: 50 }}
              xScale={{ type: "linear" }}
              yScale={{ type: "linear", min: 0, max: 100 }}
              colors={d => d.color}
              lineWidth={2}
              pointSize={4}
              pointBorderWidth={1}
              pointBorderColor={{ from: "serieColor" }}
              enableGridX={false}
              axisBottom={{ legend: "Game #", legendOffset: 32, legendPosition: "middle", tickValues: 6 }}
              axisLeft={{ format: (v: number) => `${v}%`, tickValues: 5 }}
              useMesh
              legends={[{
                anchor: "top-right", direction: "row", justify: false,
                translateX: 0, translateY: -10,
                itemWidth: 100, itemHeight: 14, itemsSpacing: 10,
                symbolSize: 10, symbolShape: "circle",
              }]}
            />
          </Box>
        </Paper>
      )}

      {/* Termination types */}
      {terminationData.length > 1 && (
        <Paper sx={{ p: 3, borderRadius: 3, background: "rgba(255,255,255,0.03)" }}>
          <Typography variant="h6" fontWeight={700} mb={2}>How Games End</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 5 }}>
              <Box sx={{ height: 220 }}>
                <ResponsivePie
                  data={terminationData}
                  innerRadius={0.55}
                  padAngle={1.5}
                  cornerRadius={3}
                  enableArcLabels={false}
                  enableArcLinkLabels
                  arcLinkLabelsColor={{ from: "color" }}
                  arcLinkLabelsTextColor="#888"
                  arcLinkLabelsDiagonalLength={8}
                  arcLinkLabelsStraightLength={12}
                  theme={nivoTheme}
                  colors={d => d.data.color}
                />
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 7 }}>
              <Stack spacing={1}>
                {stats.terminationTypes.slice(0, 6).map(t => (
                  <Box key={t.type} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="body2" color="text.secondary">{t.type}</Typography>
                    <Chip label={t.count} size="small" />
                  </Box>
                ))}
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Box>
  );
}
