import {
  Box,
  Button,
  LinearProgress,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
  CircularProgress,
  Chip,
  Stack,
  Grid2 as Grid,
} from "@mui/material";
import { useState } from "react";
import { useChessInsights, AnalysisTarget } from "@/hooks/useChessInsights";
import { useInsightsUsername } from "@/hooks/useInsightsUsername";
import { Icon } from "@iconify/react";
import { OverviewTab } from "./OverviewTab";
import { OpeningsTab } from "./OpeningsTab";
import { MovesTab } from "./MovesTab";
import { CalendarTab } from "./CalendarTab";

type InsightsTab = "overview" | "openings" | "moves" | "calendar";

export function InsightsDashboard() {
  const [storedUsername, setStoredUsername] = useInsightsUsername();
  const username = storedUsername ?? "";

  const {
    stats,
    isAnalyzing,
    isFetching,
    fetchError,
    progress,
    startBatchAnalysis,
    fetchExternalGames,
    analysisTarget,
    setAnalysisTarget,
    unanalyzedCount,
    analyzedCount,
    totalCount,
    isReady,
  } = useChessInsights(username);

  const [activeTab, setActiveTab] = useState<InsightsTab>("overview");
  const [platform, setPlatform] = useState<"lichess" | "chess.com">("lichess");
  const [externalUsername, setExternalUsername] = useState("");

  const handleFetch = () => {
    if (externalUsername.trim()) fetchExternalGames(externalUsername.trim(), platform);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0a0a0f 0%, #0f0f1e 50%, #0a0f0a 100%)",
      }}
    >
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <Box sx={{
        background: "linear-gradient(180deg, rgba(25,118,210,0.12) 0%, transparent 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        px: { xs: 2, md: 4 },
        py: 3,
      }}>
        <Box sx={{ maxWidth: 1280, mx: "auto" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3, flexWrap: "wrap" }}>
            <Box sx={{
              p: 1.2, borderRadius: 2,
              background: "linear-gradient(135deg, #1976d2, #42a5f5)",
              display: "flex", alignItems: "center",
            }}>
              <Icon icon="mdi:chart-areaspline" height={28} color="#fff" />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" fontWeight={800} letterSpacing="-0.5px">
                Chess Insights
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your unified chess identity · Powered by Stockfish 17
              </Typography>
            </Box>

            {/* Status chips */}
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip
                icon={<Icon icon="mdi:database" height={14} />}
                label={`${totalCount} games`}
                size="small"
                variant="outlined"
              />
              {analyzedCount > 0 && (
                <Chip
                  icon={<Icon icon="mdi:check-circle" height={14} />}
                  label={`${analyzedCount} analyzed`}
                  size="small"
                  color="success"
                  variant="outlined"
                />
              )}
              {unanalyzedCount > 0 && (
                <Button
                  variant="contained"
                  size="small"
                  onClick={startBatchAnalysis}
                  disabled={isAnalyzing || !isReady}
                  startIcon={isAnalyzing
                    ? <CircularProgress size={14} color="inherit" />
                    : <Icon icon="mdi:brain" height={16} />
                  }
                  sx={{ borderRadius: 6, px: 2 }}
                >
                  {isAnalyzing ? `Analyzing… ${Math.round(progress)}%` : `Analyze ${unanalyzedCount}`}
                </Button>
              )}
            </Stack>
          </Box>

          {/* ─── Username + Platform Row ──────────────────────────────────────── */}
          <Paper sx={{
            p: 2, borderRadius: 3,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}>
            <Grid container spacing={2} alignItems="center">
              {/* My username */}
              <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                <TextField
                  label="My Username"
                  size="small"
                  fullWidth
                  value={username}
                  onChange={e => setStoredUsername(e.target.value)}
                  helperText="Used to assign White/Black stats"
                  InputProps={{
                    startAdornment: <Icon icon="mdi:account-circle" height={20} style={{ marginRight: 8, opacity: 0.5 }} />,
                  }}
                />
              </Grid>

              {/* Divider line */}
              <Grid size={{ xs: 12, sm: "auto" }}>
                <Box sx={{ height: "100%", width: 1, bgcolor: "divider", mx: "auto" }} />
              </Grid>

              {/* Platform picker */}
              <Grid size={{ xs: "auto" }}>
                <ToggleButtonGroup
                  value={platform}
                  exclusive
                  onChange={(_, v) => v && setPlatform(v)}
                  size="small"
                >
                  <ToggleButton value="lichess" sx={{ gap: 0.8, px: 2 }}>
                    <Icon icon="simple-icons:lichess" height={16} />
                    Lichess
                  </ToggleButton>
                  <ToggleButton value="chess.com" sx={{ gap: 0.8, px: 2 }}>
                    <Icon icon="simple-icons:chessdotcom" height={16} />
                    Chess.com
                  </ToggleButton>
                </ToggleButtonGroup>
              </Grid>

              {/* External username */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label={`${platform === "lichess" ? "Lichess" : "Chess.com"} Username`}
                  size="small"
                  fullWidth
                  value={externalUsername}
                  onChange={e => setExternalUsername(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleFetch()}
                  placeholder={`Enter your ${platform} username`}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: "auto" }}>
                <Button
                  variant="outlined"
                  onClick={handleFetch}
                  disabled={isFetching || !externalUsername.trim()}
                  startIcon={isFetching
                    ? <CircularProgress size={16} color="inherit" />
                    : <Icon icon="mdi:cloud-download-outline" height={18} />
                  }
                  sx={{ borderRadius: 2, height: 40, whiteSpace: "nowrap" }}
                  fullWidth
                >
                  {isFetching ? "Fetching…" : "Fetch Games"}
                </Button>
              </Grid>
            </Grid>

            {fetchError && (
              <Alert severity="error" sx={{ mt: 1.5 }} onClose={() => {}}>
                {fetchError}
              </Alert>
            )}
          </Paper>

          {/* ─── Analysis Target Tabs ─────────────────────────────────────────── */}
          <Box sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
            {(["combined", "local", "external"] as AnalysisTarget[]).map(t => (
              <Chip
                key={t}
                label={t === "combined" ? "Unified Identity" : t === "local" ? "Saved Games" : "External Cloud"}
                onClick={() => setAnalysisTarget(t)}
                variant={analysisTarget === t ? "filled" : "outlined"}
                color={analysisTarget === t ? "primary" : "default"}
                icon={<Icon icon={
                  t === "combined" ? "mdi:earth" :
                  t === "local" ? "mdi:database" : "mdi:cloud"
                } height={14} />}
              />
            ))}
          </Box>
        </Box>
      </Box>

      {/* ─── Analysis Progress Bar ────────────────────────────────────────────── */}
      {isAnalyzing && (
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ height: 3 }}
        />
      )}

      {/* ─── No Data State ────────────────────────────────────────────────────── */}
      {!stats && (
        <Box sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, md: 4 }, py: 10, textAlign: "center" }}>
          <Icon icon="mdi:chart-areaspline" height={64} opacity={0.15} />
          <Typography variant="h5" sx={{ mt: 2, mb: 1 }}>No Insights Yet</Typography>
          <Typography color="text.secondary" maxWidth={440} mx="auto">
            Fetch games from Lichess or Chess.com above, then click <strong>Analyze</strong> to run Stockfish.
            Results appear here as games are processed.
          </Typography>
        </Box>
      )}

      {/* ─── Main Content ─────────────────────────────────────────────────────── */}
      {stats && (
        <Box sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, md: 4 }, py: 3 }}>
          {/* Section Tabs */}
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{
              mb: 3,
              "& .MuiTabs-indicator": {
                background: "linear-gradient(90deg, #1976d2, #42a5f5)",
                height: 3,
                borderRadius: 2,
              },
            }}
          >
            <Tab value="overview" label="Overview" icon={<Icon icon="mdi:view-dashboard" height={18} />} iconPosition="start" />
            <Tab value="openings" label="Openings" icon={<Icon icon="mdi:book-open-variant" height={18} />} iconPosition="start" />
            <Tab value="moves" label="Moves" icon={<Icon icon="mdi:chess-knight" height={18} />} iconPosition="start" />
            <Tab value="calendar" label="Calendar" icon={<Icon icon="mdi:calendar-clock" height={18} />} iconPosition="start" />
          </Tabs>

          {activeTab === "overview" && <OverviewTab stats={stats} />}
          {activeTab === "openings" && <OpeningsTab stats={stats} />}
          {activeTab === "moves" && <MovesTab stats={stats} onAnalyze={startBatchAnalysis} isAnalyzing={isAnalyzing} unanalyzedCount={unanalyzedCount} />}
          {activeTab === "calendar" && <CalendarTab stats={stats} />}
        </Box>
      )}
    </Box>
  );
}
