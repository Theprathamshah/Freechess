import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import { useState, useMemo, useEffect } from "react";
import { InsightStats } from "@/hooks/useChessInsights";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Icon } from "@iconify/react";
import ReactMarkdown from "react-markdown";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_KEY_STORAGE = "gemini_api_key";
const GEMINI_MODEL_STORAGE = "gemini_model_selection";
const GOLD = "#c9a227";

const DEFAULT_MODELS = [
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-pro",
  "gemini-2.0-flash-exp",
  "gemini-1.5-flash-8b",
];

interface Props {
  stats: InsightStats;
}

export function CoachTab({ stats }: Props) {
  const [apiKey, setApiKey] = useLocalStorage<string>(GEMINI_KEY_STORAGE, "");
  const [selectedModel, setSelectedModel] = useLocalStorage<string>(GEMINI_MODEL_STORAGE, "gemini-1.5-flash");
  const [showKeyInput, setShowKeyInput] = useState(!apiKey);
  const [analysis, setAnalysis] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>(DEFAULT_MODELS);

  // ─── Model Discovery ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!apiKey) return;

    const fetchModels = async () => {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
        const data = await res.json();
        if (data.models) {
          const names = data.models
            .filter((m: any) => m.supportedGenerationMethods.includes("generateContent"))
            .map((m: any) => m.name.replace("models/", ""));
          setAvailableModels(names.length > 0 ? names : DEFAULT_MODELS);
        }
      } catch (err) {
        console.warn("Failed to fetch available models:", err);
      }
    };
    fetchModels();
  }, [apiKey]);

  // ─── Data Formatting ───────────────────────────────────────────────────────

  const promptContent = useMemo(() => {
    const overall_accuracy = `${stats.avgAccuracy.toFixed(1)}%`;
    const win_rate = `${((stats.asWhite.wins + stats.asBlack.wins) / stats.totalGames * 100).toFixed(1)}%`;
    const white_accuracy = `${stats.asWhite.avgAccuracy.toFixed(1)}%`;
    const black_accuracy = `${stats.asBlack.avgAccuracy.toFixed(1)}%`;
    const white_stats = `W: ${stats.asWhite.wins} / D: ${stats.asWhite.draws} / L: ${stats.asWhite.losses} (${stats.asWhite.winRate.toFixed(1)}% win rate)`;
    const black_stats = `W: ${stats.asBlack.wins} / D: ${stats.asBlack.draws} / L: ${stats.asBlack.losses} (${stats.asBlack.winRate.toFixed(1)}% win rate)`;

    const opening_accuracy = `${stats.phaseAccuracy.find(p => p.phase === "Opening")?.accuracy.toFixed(1)}%`;
    const middlegame_accuracy = `${stats.phaseAccuracy.find(p => p.phase === "Middlegame")?.accuracy.toFixed(1)}%`;
    const endgame_accuracy = `${stats.phaseAccuracy.find(p => p.phase === "Endgame")?.accuracy.toFixed(1)}%`;

    const blunders = stats.moveQuality.find(m => m.classification === "blunder")?.count ?? 0;
    const mistakes = stats.moveQuality.find(m => m.classification === "mistake")?.count ?? 0;
    const inaccuracies = stats.moveQuality.find(m => m.classification === "inaccuracy")?.count ?? 0;

    const topOpeningsWhite = stats.openingsAsWhite.slice(0, 3).map(o => `${o.name} (${o.winRate.toFixed(0)}% win rate)`).join(", ");
    const topOpeningsBlack = stats.openingsAsBlack.slice(0, 3).map(o => `${o.name} (${o.winRate.toFixed(0)}% win rate)`).join(", ");
    const opening_stats = `As White: ${topOpeningsWhite || "N/A"}. As Black: ${topOpeningsBlack || "N/A"}`;

    return `* Overall accuracy: ${overall_accuracy}
* Win rate: ${win_rate}
* Accuracy as White: ${white_accuracy}
* Accuracy as Black: ${black_accuracy}
* Wins/Losses split (White/Black): White[${white_stats}], Black[${black_stats}]
* Accuracy by phase: Opening[${opening_accuracy}], Middlegame[${middlegame_accuracy}], Endgame[${endgame_accuracy}]
* Blunder count: ${blunders}
* Mistakes: ${mistakes}
* Inaccuracies: ${inaccuracies}
* Opening performance: ${opening_stats}`;
  }, [stats]);

  const handleGenerate = async () => {
    if (!apiKey) {
      setError("Please provide a Gemini API Key first.");
      setShowKeyInput(true);
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel(
        { model: selectedModel },
        { apiVersion: "v1" }
      );

      const fullPrompt = `You are a chess coach analyzing a player's performance.
Based on the following structured data, identify the player's TOP 3 weaknesses.

DATA:
${promptContent}

TASK:
1. Identify the 3 most critical weaknesses
2. Be specific (NOT generic like "improve tactics")
3. Use patterns (e.g., “losing advantage in middlegame”, “poor performance with White”)
4. Prioritize impact on winning

OUTPUT FORMAT:
* Weakness 1: <clear explanation>
* Weakness 2: <clear explanation>
* Weakness 3: <clear explanation>`;

      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      setAnalysis(response.text());
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);

      if (msg.includes("404") || msg.includes("not found")) {
        setError(`${msg}. Try selecting a different model from the settings dropdown. Ensure 'Generative Language API' is enabled in your Google Cloud Console.`);
      }

      if (err instanceof Error && err.message.includes("API_KEY_INVALID")) {
        setShowKeyInput(true);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(analysis);
  };

  return (
    <Box>
      {/* ─── API Settings ─── */}
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3, background: "rgba(201,162,39,0.04)", border: "1px dashed rgba(201,162,39,0.2)" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Icon icon="logos:google-gemini" height={20} />
            <Typography variant="body2" fontWeight={700}>AI Coaching Configuration</Typography>
          </Box>
          <Button
            size="small"
            variant="text"
            onClick={() => setShowKeyInput(!showKeyInput)}
            sx={{ color: GOLD }}
          >
            {showKeyInput ? "Hide Settings" : "Edit Settings"}
          </Button>
        </Box>

        {showKeyInput && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <TextField
                fullWidth
                size="small"
                type="password"
                label="Gemini API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your key here..."
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />
              <Tooltip title="Get a free key from Google AI Studio">
                <IconButton href="https://aistudio.google.com/app/apikey" target="_blank" size="small">
                  <Icon icon="mdi:information-outline" />
                </IconButton>
              </Tooltip>
            </Box>

            <FormControl fullWidth size="small">
              <InputLabel>AI Model</InputLabel>
              <Select
                value={selectedModel}
                label="AI Model"
                onChange={(e) => setSelectedModel(e.target.value)}
                sx={{ borderRadius: 2 }}
              >
                {availableModels.map(name => (
                  <MenuItem key={name} value={name}>{name}</MenuItem>
                ))}
              </Select>
              <Typography variant="caption" sx={{ mt: 0.5, opacity: 0.6 }}>
                Pick a model from the list. If your preferred model is missing, check your API Key permissions.
              </Typography>
            </FormControl>
          </Box>
        )}
      </Paper>

      {/* ─── Generation Action ─── */}
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleGenerate}
          disabled={isGenerating || stats.analyzedGames === 0}
          startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : <Icon icon="mdi:auto-fix" />}
          sx={{
            px: 6,
            py: 1.5,
            borderRadius: 8,
            boxShadow: `0 8px 16px rgba(201,162,39,0.25)`,
            "&:hover": { boxShadow: `0 12px 24px rgba(201,162,39,0.4)` }
          }}
        >
          {isGenerating ? "Analyzing..." : "Generate Coaching Report"}
        </Button>
        {stats.analyzedGames === 0 && (
          <Typography variant="caption" color="error" sx={{ display: "block", mt: 1 }}>
            Analyze some games first to see insights!
          </Typography>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>
      )}

      {/* ─── Output ─── */}
      {analysis && (
        <Paper
          sx={{
            p: 4,
            borderRadius: 4,
            position: "relative",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
            boxShadow: "0 24px 48px rgba(0,0,0,0.5)"
          }}
        >
          <Box sx={{ position: "absolute", top: 16, right: 16 }}>
            <Tooltip title="Copy to clipboard">
              <IconButton onClick={handleCopy} size="small" sx={{ opacity: 0.6, "&:hover": { opacity: 1 } }}>
                <Icon icon="mdi:content-copy" />
              </IconButton>
            </Tooltip>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: "rgba(201,162,39,0.1)", color: GOLD }}>
              <Icon icon="mdi:shield-outline" height={24} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800} letterSpacing="-0.5px">Coach's Analysis</Typography>
              <Typography variant="caption" color="text.secondary">Generated by {selectedModel} · {stats.analyzedGames} games</Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 3, opacity: 0.1 }} />

          <Box sx={{
            "& li": { mb: 2, listStyle: "none" },
            "& p": { m: 0, color: "text.secondary" },
            "& strong": { color: GOLD, fontSize: "1.1rem", borderBottom: `2px solid rgba(201,162,39,0.2)`, pb: 0.5, mb: 1.5, display: "inline-block" }
          }}>
            <ReactMarkdown>{analysis}</ReactMarkdown>
          </Box>
        </Paper>
      )}

      {/* ─── Debug Information ─── */}
      {!analysis && !isGenerating && (
        <Box sx={{ opacity: 0.3, mt: 4 }}>
          <Typography variant="caption" sx={{ textTransform: "uppercase", letterSpacing: "0.1em", mb: 1, display: "block" }}>
            Data points mapped for analysis:
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: "transparent" }}>
            <pre style={{ fontSize: "0.75rem", margin: 0, overflowX: "auto" }}>
              {promptContent}
            </pre>
          </Paper>
        </Box>
      )}
    </Box>
  );
}
