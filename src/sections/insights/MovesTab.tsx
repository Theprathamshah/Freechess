import { ResponsiveBar } from "@nivo/bar";
import { ResponsiveRadar } from "@nivo/radar";
import { Box, Paper, Typography, Grid2 as Grid, Stack, Button } from "@mui/material";
import { Icon } from "@iconify/react";
import { InsightStats } from "@/hooks/useChessInsights";

interface Props {
  stats: InsightStats;
  onAnalyze?: () => void;
  isAnalyzing?: boolean;
  unanalyzedCount?: number;
}

const nivoTheme = {
  background: "transparent",
  text: { fill: "#aaa", fontSize: 11 },
  axis: { ticks: { text: { fill: "#777" } } },
  grid: { line: { stroke: "#2a2a2a" } },
  tooltip: { container: { background: "#1a1a2e", border: "1px solid #333", color: "#fff" } },
};

function NeedsAnalysisBadge({ count, onAnalyze }: { count: number; onAnalyze?: () => void }) {
  return (
    <Box sx={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", py: 4, gap: 1.5,
    }}>
      <Icon icon="mdi:brain" height={36} opacity={0.3} />
      <Typography color="text.secondary" variant="body2" textAlign="center">
        Move quality requires Stockfish analysis.
      </Typography>
      {count > 0 && onAnalyze && (
        <Button
          variant="contained"
          size="small"
          onClick={onAnalyze}
          startIcon={<Icon icon="mdi:lightning-bolt" height={16} />}
          sx={{ borderRadius: 6, mt: 0.5 }}
        >
          Analyze {count} games now
        </Button>
      )}
    </Box>
  );
}

export function MovesTab({ stats, onAnalyze, unanalyzedCount = 0 }: Props) {
  const hasAnalyzedGames = stats.analyzedGames > 0;

  const moveQualityData = stats.moveQuality.map(m => ({
    classification: m.label.replace(/ .*/u, ""), // strip emoji for axis label
    count: m.count,
    percentage: +m.percentage.toFixed(1),
    color: m.color,
  }));

  // Only show radar when we have real (non-zero) data
  const phaseHasData = stats.phaseAccuracy.some(p => p.accuracy > 0);
  const radarData = stats.phaseAccuracy.map(p => ({
    phase: p.phase,
    Accuracy: +p.accuracy.toFixed(1),
  }));

  const castlingData = stats.castlingStats.map(c => ({
    scenario: c.scenario,
    "Win Rate": +c.winRate.toFixed(1),
    Games: c.games,
  }));

  return (
    <Box>
      {/* Move Quality Distribution */}
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3, background: "rgba(255,255,255,0.03)" }}>
        <Typography variant="h6" fontWeight={700} mb={0.5}>Move Quality Distribution</Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          How you play across all analyzed games
        </Typography>

        {!hasAnalyzedGames ? (
          <NeedsAnalysisBadge count={unanalyzedCount} onAnalyze={onAnalyze} />
        ) : (
          <Stack spacing={1.2}>
            {stats.moveQuality.map(m => (
              <Box key={m.classification}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.4 }}>
                  <Typography variant="body2" fontWeight={600}>{m.label}</Typography>
                  <Box sx={{ display: "flex", gap: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">{m.count} moves</Typography>
                    <Typography variant="caption" sx={{ color: m.color, fontWeight: 700, minWidth: 40, textAlign: "right" }}>
                      {m.percentage.toFixed(1)}%
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ height: 8, borderRadius: 4, bgcolor: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                  <Box sx={{
                    height: "100%",
                    width: `${m.percentage}%`,
                    bgcolor: m.color,
                    borderRadius: 4,
                    transition: "width 0.6s ease",
                  }} />
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Paper>

      <Grid container spacing={2.5} mb={3}>
        {/* Phase Accuracy Radar */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, borderRadius: 3, background: "rgba(255,255,255,0.03)", height: "100%" }}>
            <Typography variant="h6" fontWeight={700} mb={0.5}>Accuracy by Game Phase</Typography>
            <Typography variant="body2" color="text.secondary" mb={1}>
              Where do you play best?
            </Typography>
            {!hasAnalyzedGames || !phaseHasData ? (
              <NeedsAnalysisBadge count={unanalyzedCount} onAnalyze={onAnalyze} />
            ) : (
              <>
                <Box sx={{ height: 240 }}>
                  <ResponsiveRadar
                    data={radarData}
                    keys={["Accuracy"]}
                    indexBy="phase"
                    maxValue={100}
                    valueFormat={v => `${v}%`}
                    margin={{ top: 30, right: 60, bottom: 30, left: 60 }}
                    theme={nivoTheme}
                    colors={["#1976d2"]}
                    fillOpacity={0.25}
                    borderColor={{ from: "color" }}
                    gridLevels={4}
                    dotSize={8}
                    dotColor={{ from: "color" }}
                    enableDotLabel
                    dotLabel="value"
                    dotLabelYOffset={-12}
                  />
                </Box>
                {/* Phase accuracy legend */}
                <Stack direction="row" justifyContent="center" spacing={3} mt={1}>
                  {stats.phaseAccuracy.map(p => (
                    <Box key={p.phase} sx={{ textAlign: "center" }}>
                      <Typography variant="h6" fontWeight={700} color="primary.main">
                        {p.accuracy.toFixed(0)}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{p.phase}</Typography>
                    </Box>
                  ))}
                </Stack>
              </>
            )}
          </Paper>
        </Grid>

        {/* Castling Stats */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, borderRadius: 3, background: "rgba(255,255,255,0.03)", height: "100%" }}>
            <Typography variant="h6" fontWeight={700} mb={0.5}>Castling Impact</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Win rate when you castle vs don&apos;t
            </Typography>
            {stats.castlingStats.length > 0 ? (
              <>
                <Box sx={{ height: 180 }}>
                  <ResponsiveBar
                    data={castlingData}
                    keys={["Win Rate"]}
                    indexBy="scenario"
                    colors={["#1976d2"]}
                    theme={nivoTheme}
                    margin={{ top: 10, right: 20, bottom: 40, left: 50 }}
                    padding={0.5}
                    axisLeft={{ format: (v: number) => `${v}%` }}
                    enableLabel
                    label={d => `${d.value}%`}
                    labelSkipHeight={10}
                    borderRadius={4}
                  />
                </Box>
                <Stack direction="row" spacing={2} mt={1} justifyContent="center">
                  {stats.castlingStats.map(c => (
                    <Box key={c.scenario} sx={{ textAlign: "center" }}>
                      <Typography variant="h6" fontWeight={700}>{c.games}</Typography>
                      <Typography variant="caption" color="text.secondary">{c.scenario}</Typography>
                    </Box>
                  ))}
                </Stack>
              </>
            ) : (
              <Typography color="text.disabled" sx={{ py: 4, textAlign: "center" }}>
                Not enough data
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Move Quality Bar Chart (only when analyzed) */}
      {hasAnalyzedGames && moveQualityData.length > 0 && (
        <Paper sx={{ p: 3, borderRadius: 3, background: "rgba(255,255,255,0.03)" }}>
          <Typography variant="h6" fontWeight={700} mb={2}>Move Quality by Count</Typography>
          <Box sx={{ height: 220 }}>
            <ResponsiveBar
              data={moveQualityData}
              keys={["count"]}
              indexBy="classification"
              colors={d => (stats.moveQuality.find(m => m.label.startsWith(d.indexValue as string))?.color ?? "#777")}
              theme={nivoTheme}
              margin={{ top: 10, right: 20, bottom: 40, left: 60 }}
              padding={0.3}
              axisLeft={{ legend: "Moves", legendOffset: -45, legendPosition: "middle" }}
              axisBottom={{ tickRotation: -20 }}
              borderRadius={3}
              enableLabel={false}
            />
          </Box>
        </Paper>
      )}
    </Box>
  );
}
