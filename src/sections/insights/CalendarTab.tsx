import { ResponsiveBar } from "@nivo/bar";
import { Box, Paper, Typography, Grid2 as Grid } from "@mui/material";

import { InsightStats } from "@/hooks/useChessInsights";

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

function toBarColor(winRate: number): string {
  if (winRate >= 60) return "#4CAF50";
  if (winRate >= 50) return "#8BC34A";
  if (winRate >= 40) return "#FFC107";
  return "#EF5350";
}

export function CalendarTab({ stats }: Props) {
  const hourData = stats.hourStats.filter(h => h.games > 0).map(h => ({
    hour: h.label,
    "Win Rate": +h.winRate.toFixed(1),
    Accuracy: +h.accuracy.toFixed(1),
    games: h.games,
    color: toBarColor(h.winRate),
  }));

  const dayData = stats.dayOfWeekStats.map(d => ({
    day: d.short,
    "Win Rate": +d.winRate.toFixed(1),
    Accuracy: +d.accuracy.toFixed(1),
    games: d.games,
    color: toBarColor(d.winRate),
  }));

  // Best hour to play
  const bestHour = stats.hourStats
    .filter(h => h.games >= 3)
    .sort((a, b) => b.winRate - a.winRate)[0];

  const worstHour = stats.hourStats
    .filter(h => h.games >= 3)
    .sort((a, b) => a.winRate - b.winRate)[0];

  const bestDay = stats.dayOfWeekStats
    .filter(d => d.games >= 2)
    .sort((a, b) => b.winRate - a.winRate)[0];

  const hasCalendarData = hourData.length > 0;
  const hasDayData = dayData.some(d => d.games > 0);

  if (!hasCalendarData && !hasDayData) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <Typography color="text.secondary" mb={1}>
          No calendar data available yet.
        </Typography>
        <Typography variant="caption" color="text.disabled">
          Fetch your games from Lichess or Chess.com to see when you play best.
          Hours are shown in UTC time.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Insight Badges */}
      {(bestHour || bestDay) && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
          {bestHour && (
            <Paper sx={{ p: 2, borderRadius: 3, background: "rgba(76,175,80,0.08)", flex: 1, minWidth: 200 }}>
              <Typography variant="caption" color="text.secondary">Best Hour to Play</Typography>
              <Typography variant="h5" fontWeight={700} color="success.main">{bestHour.label}</Typography>
              <Typography variant="body2" color="text.secondary">
                {bestHour.winRate.toFixed(0)}% win rate · {bestHour.games} games
              </Typography>
            </Paper>
          )}
          {worstHour && worstHour.label !== bestHour?.label && (
            <Paper sx={{ p: 2, borderRadius: 3, background: "rgba(239,83,80,0.08)", flex: 1, minWidth: 200 }}>
              <Typography variant="caption" color="text.secondary">Worst Hour to Play</Typography>
              <Typography variant="h5" fontWeight={700} color="error.main">{worstHour.label}</Typography>
              <Typography variant="body2" color="text.secondary">
                {worstHour.winRate.toFixed(0)}% win rate · {worstHour.games} games
              </Typography>
            </Paper>
          )}
          {bestDay && (
            <Paper sx={{ p: 2, borderRadius: 3, background: "rgba(25,118,210,0.08)", flex: 1, minWidth: 200 }}>
              <Typography variant="caption" color="text.secondary">Best Day of Week</Typography>
              <Typography variant="h5" fontWeight={700} color="primary.main">{bestDay.day}</Typography>
              <Typography variant="body2" color="text.secondary">
                {bestDay.winRate.toFixed(0)}% win rate · {bestDay.games} games
              </Typography>
            </Paper>
          )}
        </Box>
      )}

      {/* Hour of Day */}
      {hourData.length > 0 && (
        <Paper sx={{ p: 3, borderRadius: 3, mb: 3, background: "rgba(255,255,255,0.03)" }}>
          <Typography variant="h6" fontWeight={700} mb={0.5}>Win Rate by Hour of Day</Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            When do you perform best?
          </Typography>
          <Box sx={{ height: 240 }}>
            <ResponsiveBar
              data={hourData}
              keys={["Win Rate"]}
              indexBy="hour"
              colors={d => (hourData.find(h => h.hour === d.indexValue)?.color ?? "#777")}
              theme={nivoTheme}
              margin={{ top: 10, right: 20, bottom: 45, left: 50 }}
              padding={0.3}
              axisLeft={{ format: (v: number) => `${v}%` }}

              enableLabel={false}
              borderRadius={3}
              tooltip={({ indexValue, value }) => {
                const h = hourData.find(d => d.hour === indexValue);
                return (
                  <Box sx={{ bgcolor: "#1a1a2e", p: 1.5, borderRadius: 1, border: "1px solid #333" }}>
                    <Typography variant="caption" color="white">
                      {indexValue}: {value}% wins · {h?.games} games · {h?.Accuracy?.toFixed(0)}% accuracy
                    </Typography>
                  </Box>
                );
              }}
            />
          </Box>
        </Paper>
      )}

      {/* Day of Week */}
      {hasDayData && (
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper sx={{ p: 3, borderRadius: 3, background: "rgba(255,255,255,0.03)" }}>
              <Typography variant="h6" fontWeight={700} mb={0.5}>Win Rate by Day of Week</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Your weekly performance pattern
              </Typography>
              <Box sx={{ height: 200 }}>
                <ResponsiveBar
                  data={dayData}
                  keys={["Win Rate"]}
                  indexBy="day"
                  colors={d => (dayData.find(h => h.day === d.indexValue)?.color ?? "#777")}
                  theme={nivoTheme}
                  margin={{ top: 10, right: 20, bottom: 40, left: 50 }}
                  padding={0.35}
                  axisLeft={{ format: (v: number) => `${v}%` }}
                  enableLabel={false}
                  borderRadius={3}
                />
              </Box>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper sx={{ p: 3, borderRadius: 3, background: "rgba(255,255,255,0.03)", height: "100%" }}>
              <Typography variant="h6" fontWeight={700} mb={2}>Day Breakdown</Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {stats.dayOfWeekStats.map(d => (
                  <Box key={d.day} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Typography variant="body2" sx={{ width: 36, color: "text.secondary" }}>{d.short}</Typography>
                    <Box sx={{
                      flex: 1, height: 6, borderRadius: 3,
                      bgcolor: "rgba(255,255,255,0.06)",
                      overflow: "hidden",
                    }}>
                      <Box sx={{
                        height: "100%",
                        width: `${d.winRate}%`,
                        bgcolor: toBarColor(d.winRate),
                        borderRadius: 3,
                      }} />
                    </Box>
                    <Typography variant="caption" sx={{ width: 55, textAlign: "right", color: "text.secondary" }}>
                      {d.games > 0 ? `${d.winRate.toFixed(0)}% / ${d.games}g` : "—"}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
