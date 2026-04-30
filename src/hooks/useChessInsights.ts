import { useGameDatabase } from "./useGameDatabase";
import { MoveClassification } from "@/types/enums";
import { CloudGame, Game, LoadedGame } from "@/types/game";
import { GameEval } from "@/types/eval";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Chess } from "chess.js";
import { getLichessUserRecentGames } from "@/lib/lichess";
import { getChessComUserRecentGames } from "@/lib/chessCom";
import {
  fetchCloudGames,
  getCloudAnalysisJob,
  ingestGamesToCloud,
  queueCloudAnalysis,
} from "@/lib/cloudInsightsApi";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AnalysisTarget = "local" | "external" | "combined";

export type ExtendedGame = (Game | (LoadedGame & { eval?: GameEval }));

export type CloudAnalysisJobStatus = "idle" | "queued" | "processing";

export interface ColorStats {
  games: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  drawRate: number;
  lossRate: number;
  avgAccuracy: number;
}

export interface OpeningStat {
  name: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  avgAccuracy: number;
}

export interface MoveQualityStat {
  label: string;
  classification: MoveClassification;
  count: number;
  percentage: number;
  color: string;
}

export interface PhaseAccuracyStat {
  phase: string;
  accuracy: number;
}

export interface TerminationStat {
  type: string;
  count: number;
}

export interface HourStat {
  hour: number;
  label: string;
  games: number;
  winRate: number;
  accuracy: number;
}

export interface DayOfWeekStat {
  day: string;
  short: string;
  games: number;
  winRate: number;
  accuracy: number;
}

export interface CastlingStat {
  scenario: string;
  games: number;
  wins: number;
  winRate: number;
}

export interface InsightStats {
  // Overview
  totalGames: number;
  analyzedGames: number;
  avgAccuracy: number;
  asWhite: ColorStats;
  asBlack: ColorStats;
  accuracyOverTime: { date: string; white: number; black: number; gameIndex: number }[];

  // Move quality (combined)
  moveQuality: MoveQualityStat[];

  // Openings
  openingsAsWhite: OpeningStat[];
  openingsAsBlack: OpeningStat[];

  // Game phases
  phaseAccuracy: PhaseAccuracyStat[];

  // Terminations (won/lost/drawn by what)
  terminationTypes: TerminationStat[];

  // Castling
  castlingStats: CastlingStat[];

  // Calendar
  hourStats: HourStat[];
  dayOfWeekStats: DayOfWeekStat[];

}

// ─── Move Quality Palette ─────────────────────────────────────────────────────

const MOVE_QUALITY_META: Record<string, { label: string; color: string; order: number }> = {
  [MoveClassification.Splendid]: { label: "Splendid ✨", color: "#FFD700", order: 1 },
  [MoveClassification.Perfect]: { label: "Perfect 💎", color: "#00E5FF", order: 2 },
  [MoveClassification.Best]: { label: "Best ✅", color: "#4CAF50", order: 3 },
  [MoveClassification.Excellent]: { label: "Excellent 🟢", color: "#81C784", order: 4 },
  [MoveClassification.Okay]: { label: "Okay 🟡", color: "#FFC107", order: 5 },
  [MoveClassification.Inaccuracy]: { label: "Inaccuracy ⚠️", color: "#FF9800", order: 6 },
  [MoveClassification.Mistake]: { label: "Mistake ❌", color: "#F44336", order: 7 },
  [MoveClassification.Blunder]: { label: "Blunder 💀", color: "#B71C1C", order: 8 },
  [MoveClassification.Forced]: { label: "Forced", color: "#90A4AE", order: 9 },
  [MoveClassification.Opening]: { label: "Opening 📖", color: "#7E57C2", order: 10 },
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Maps each move classification to an approximate accuracy score (0-100)
// This mirrors chess.com's approach: derive phase accuracy from move quality
const CLASSIFICATION_ACCURACY: Partial<Record<MoveClassification, number>> = {
  [MoveClassification.Splendid]: 100,
  [MoveClassification.Perfect]: 99,
  [MoveClassification.Best]: 95,
  [MoveClassification.Excellent]: 88,
  [MoveClassification.Okay]: 72,
  [MoveClassification.Forced]: 90,  // only move available
  [MoveClassification.Opening]: 100, // book move
  [MoveClassification.Inaccuracy]: 48,
  [MoveClassification.Mistake]: 22,
  [MoveClassification.Blunder]: 4,
};

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Determine if the result is a win for the side that played as `color`. */
function isWinForColor(result: string | undefined, color: "white" | "black"): boolean {
  if (result === "1-0") return color === "white";
  if (result === "0-1") return color === "black";
  return false;
}
function isDrawForResult(result: string | undefined): boolean {
  return result === "1/2-1/2";
}

function detectUserColor(
  game: ExtendedGame,
  username: string
): "white" | "black" | null {
  if (!username.trim()) return null;
  const u = username.toLowerCase().trim();
  if (game.white.name.toLowerCase().trim() === u) return "white";
  if (game.black.name.toLowerCase().trim() === u) return "black";
  return null;
}

/** Extract hour-of-day (0-23) from a game ISO date string. */
function extractHour(game: ExtendedGame): number | null {
  if (!game.date) return null;
  // date is stored as ISO string (e.g. 2024-03-15T22:00:00.000Z)
  const d = new Date(game.date);
  if (isNaN(d.getTime())) return null;
  return d.getUTCHours(); // use UTC to be consistent across timezones
}

function extractDayOfWeek(game: ExtendedGame): number | null {
  if (!game.date) return null;
  const d = new Date(game.date);
  if (isNaN(d.getTime())) return null;
  return d.getUTCDay();
}

/** Detect castling from PGN move text. */
function didCastle(pgn: string, color: "white" | "black"): boolean {
  try {
    const c = new Chess();
    c.loadPgn(pgn);
    const hist = c.history();
    // Castling moves in SAN are "O-O" or "O-O-O"
    // White moves are at even indices (0,2,4…), black at odd (1,3,5…)
    const offset = color === "white" ? 0 : 1;
    return hist.some((move, i) => i % 2 === offset && (move === "O-O" || move === "O-O-O"));
  } catch {
    return false;
  }
}

function detectTermination(game: ExtendedGame): string {
  // Local games have a termination field; external games need PGN header parsing
  const termination =
    (game as Game).termination ||
    game.pgn.match(/\[Termination "(.+?)"\]/)?.[1] ||
    "";
  const result = game.result || "*";

  if (result === "*") return "Ongoing / Aborted";

  const t = termination.toLowerCase();
  if (t.includes("checkmate") || t.includes("checkmated")) return "Checkmate";
  if (t.includes("resign") || t.includes("abandoned")) return "Resignation";
  if (t.includes("timeout") || t.includes("time forfeit")) {
    if (result === "1/2-1/2") return "Timeout vs Insufficient";
    return "Timeout";
  }
  if (t.includes("stalemate")) return "Stalemate";
  if (t.includes("repetition")) return "Threefold Repetition";
  if (t.includes("insufficient")) return "Insufficient Material";
  if (t.includes("agreement")) return "Draw by Agreement";
  if (t.includes("50-move") || t.includes("50 move")) return "50-Move Rule";

  if (result === "1/2-1/2") return "Draw";
  if (result === "1-0" || result === "0-1") return "Resignation";
  return "Unknown";
}

// ─── Main Hook ───────────────────────────────────────────────────────────────

export const useChessInsights = (username: string) => {
  const { games, isReady: isDbReady } = useGameDatabase(true);
  const [cloudGames, setCloudGames] = useState<CloudGame[]>([]);
  const [analysisTarget, setAnalysisTarget] = useState<AnalysisTarget>("combined");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [cloudJobStatus, setCloudJobStatus] = useState<CloudAnalysisJobStatus>("idle");

  const refreshCloudGames = useCallback(async () => {
    const fetchedCloudGames = await fetchCloudGames("all", true);
    setCloudGames(fetchedCloudGames);
  }, []);

  useEffect(() => {
    refreshCloudGames().catch((error) => {
      console.error("Failed to load cloud games", error);
    });
  }, [refreshCloudGames]);

  // ── Fetch external games ──────────────────────────────────────────────────

  const fetchExternalGames = useCallback(async (
    externalUsername: string,
    platform: "lichess" | "chess.com"
  ) => {
    setIsFetching(true);
    setFetchError(null);
    try {
      const fetched =
        platform === "lichess"
          ? await getLichessUserRecentGames(externalUsername)
          : await getChessComUserRecentGames(externalUsername);

      await ingestGamesToCloud(platform, fetched);
      await refreshCloudGames();
      setAnalysisTarget("external");
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to fetch games");
    } finally {
      setIsFetching(false);
    }
  }, [refreshCloudGames]);

  // ── Combine relevant games ────────────────────────────────────────────────

  const cloudExtendedGames = useMemo(
    () =>
      cloudGames.map((game) => ({
        id: game.id,
        pgn: game.pgn,
        date: game.playedAt ?? undefined,
        white: {
          name: game.whiteName,
          rating: game.whiteRating ?? undefined,
        },
        black: {
          name: game.blackName,
          rating: game.blackRating ?? undefined,
        },
        result: game.result ?? undefined,
        timeControl: game.timeControl ?? undefined,
        url: game.url ?? undefined,
        eval: game.eval,
      })),
    [cloudGames]
  );

  const allRelevantGames = useMemo((): ExtendedGame[] => {
    if (analysisTarget === "local") return games;
    if (analysisTarget === "external") return cloudExtendedGames;
    return [...games, ...cloudExtendedGames];
  }, [games, cloudExtendedGames, analysisTarget]);

  const analyzedGames = useMemo(() =>
    allRelevantGames.filter(g => !!g.eval), [allRelevantGames]);

  const unanalyzedGames = useMemo(() =>
    allRelevantGames.filter(g => !g.eval), [allRelevantGames]);

  // ── Stats Engine ─────────────────────────────────────────────────────────

  const stats: InsightStats | null = useMemo(() => {
    // Show stats as soon as we have ANY games (even without engine analysis)
    if (allRelevantGames.length === 0) return null;


    // ── Color stats builder ───────────────────────────────────────────────
    function buildColorStats(colorGames: ExtendedGame[], color: "white" | "black"): ColorStats {
      const analysedColor = colorGames.filter(g => !!g.eval);
      const wins = colorGames.filter(g => isWinForColor(g.result, color)).length;
      const draws = colorGames.filter(g => isDrawForResult(g.result)).length;
      const losses = colorGames.length - wins - draws;
      const avgAcc = analysedColor.length === 0 ? 0 :
        analysedColor.reduce((s, g) => s + (color === "white" ? (g.eval?.accuracy?.white ?? 0) : (g.eval?.accuracy?.black ?? 0)), 0) / analysedColor.length;

      return {
        games: colorGames.length,
        wins, draws, losses,
        winRate: colorGames.length ? (wins / colorGames.length) * 100 : 0,
        drawRate: colorGames.length ? (draws / colorGames.length) * 100 : 0,
        lossRate: colorGames.length ? (losses / colorGames.length) * 100 : 0,
        avgAccuracy: avgAcc,
      };
    }


    const asWhite = buildColorStats(
      allRelevantGames.filter(g => detectUserColor(g, username) !== "black"),
      "white"
    );
    const asBlack = buildColorStats(
      allRelevantGames.filter(g => detectUserColor(g, username) === "black"),
      "black"
    );

    const accuracyOverTime = analyzedGames
      .map((g, i) => ({
        date: g.date ? new Date(g.date).toLocaleDateString() : `Game ${i + 1}`,
        white: g.eval?.accuracy?.white ?? 0,
        black: g.eval?.accuracy?.black ?? 0,
        gameIndex: i + 1,
      }))
      .sort((a, b) => a.gameIndex - b.gameIndex);

    const mqCounts: Record<string, number> = {};
    let totalCountedMoves = 0;

    analyzedGames.forEach(g => {
      g.eval?.positions.forEach(pos => {
        if (pos.moveClassification) {
          mqCounts[pos.moveClassification] = (mqCounts[pos.moveClassification] ?? 0) + 1;
          totalCountedMoves++;
        }
      });
    });

    const moveQuality: MoveQualityStat[] = Object.entries(MOVE_QUALITY_META)
      .map(([cls, meta]) => ({
        label: meta.label,
        classification: cls as MoveClassification,
        count: mqCounts[cls] ?? 0,
        percentage: totalCountedMoves ? ((mqCounts[cls] ?? 0) / totalCountedMoves) * 100 : 0,
        color: meta.color,
        order: meta.order,
      }))
      .filter(m => m.count > 0)
      .sort((a, b) => (a as any).order - (b as any).order);

    const getOpeningFromPgn = (pgn: string): string | null => {
      const openingMatch = pgn.match(/\[Opening "(.+?)"\]/);
      if (openingMatch) return openingMatch[1];
      const ecoMatch = pgn.match(/\[ECO "(.+?)"\]/);
      if (ecoMatch) {
        const ecoName = pgn.match(/\[ECOUrl ".*?\/(.*?)"\]/);
        return ecoName ? ecoName[1].replace(/-/g, " ") : ecoMatch[1];
      }
      return null;
    };

    const openingMap = (color: "white" | "black") => {
      const map: Record<string, { wins: number; draws: number; losses: number; acc: number; count: number }> = {};
      // Use ALL games for openings (not just analyzed ones) — PGN headers always available
      const colorGames = allRelevantGames.filter(g => {
        const c = detectUserColor(g, username);
        return color === "white" ? (c === "white" || c === null) : c === "black";
      });

      colorGames.forEach(g => {
        // Prefer engine-detected opening, fall back to PGN header
        const opening =
          g.eval?.positions.find(p => p.opening)?.opening ??
          getOpeningFromPgn(g.pgn);
        if (!opening) return;
        if (!map[opening]) map[opening] = { wins: 0, draws: 0, losses: 0, acc: 0, count: 0 };
        const won = isWinForColor(g.result, color);
        const drawn = isDrawForResult(g.result);
        if (won) map[opening].wins++;
        else if (drawn) map[opening].draws++;
        else map[opening].losses++;
        if (g.eval) {
          map[opening].acc += (color === "white" ? g.eval.accuracy?.white : g.eval.accuracy?.black) ?? 0;
          map[opening].count++;
        } else {
          map[opening].count++;
        }
      });

      return Object.entries(map)
        .map(([name, d]) => ({
          name,
          games: d.count,
          wins: d.wins,
          draws: d.draws,
          losses: d.losses,
          winRate: d.count ? (d.wins / d.count) * 100 : 0,
          avgAccuracy: d.count ? d.acc / d.count : 0,
        }))
        .sort((a, b) => b.games - a.games)
        .slice(0, 8);
    };

    const openingsAsWhite = openingMap("white");
    const openingsAsBlack = openingMap("black");

    // ── Phase accuracy (from move classifications) ────────────────────────
    // positions[i] = board state AFTER the i-th half-move.
    // White's moves land at odd indices (1, 3, 5...), black's at even (2, 4, 6...).
    // Opening    = moves 1–10   (half-move indices 1–20)
    // Middlegame = moves 11–30  (half-move indices 21–60)
    // Endgame    = moves 31+    (half-move indices 61+)
    let openingAcc = 0, midAcc = 0, endAcc = 0;
    let openingN = 0, midN = 0, endN = 0;

    analyzedGames.forEach(g => {
      const color = detectUserColor(g, username);
      g.eval?.positions.forEach((pos, i) => {
        if (i === 0 || !pos.moveClassification) return;
        const isWhiteMove = i % 2 === 1; // odd index = white just moved
        if (color !== null) {
          const isMyMove = color === "white" ? isWhiteMove : !isWhiteMove;
          if (!isMyMove) return;
        }
        const acc = CLASSIFICATION_ACCURACY[pos.moveClassification as MoveClassification] ?? 50;
        const moveNumber = Math.ceil(i / 2);
        if (moveNumber <= 10) { openingAcc += acc; openingN++; }
        else if (moveNumber <= 30) { midAcc += acc; midN++; }
        else { endAcc += acc; endN++; }
      });
    });

    const phaseAccuracy: PhaseAccuracyStat[] = [
      { phase: "Opening", accuracy: openingN ? openingAcc / openingN : 0 },
      { phase: "Middlegame", accuracy: midN ? midAcc / midN : 0 },
      { phase: "Endgame", accuracy: endN ? endAcc / endN : 0 },
    ];

    // ── Terminations ──────────────────────────────────────────────────────
    const termMap: Record<string, number> = {};
    allRelevantGames.forEach(g => {
      const t = detectTermination(g);
      termMap[t] = (termMap[t] ?? 0) + 1;
    });
    const terminationTypes: TerminationStat[] = Object.entries(termMap)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    // ── Castling ──────────────────────────────────────────────────────────
    const castled: { won: number; total: number } = { won: 0, total: 0 };
    const notCastled: { won: number; total: number } = { won: 0, total: 0 };

    allRelevantGames.forEach(g => {
      const color = detectUserColor(g, username) ?? "white";
      const castledGame = didCastle(g.pgn, color);
      const won = isWinForColor(g.result, color);
      if (castledGame) { castled.total++; if (won) castled.won++; }
      else { notCastled.total++; if (won) notCastled.won++; }
    });

    const castlingStats: CastlingStat[] = [
      {
        scenario: "Castled",
        games: castled.total,
        wins: castled.won,
        winRate: castled.total ? (castled.won / castled.total) * 100 : 0,
      },
      {
        scenario: "Didn't Castle",
        games: notCastled.total,
        wins: notCastled.won,
        winRate: notCastled.total ? (notCastled.won / notCastled.total) * 100 : 0,
      },
    ];

    // ── Hour of day ───────────────────────────────────────────────────────
    const hourData: Record<number, { wins: number; total: number; acc: number; accN: number }> = {};

    allRelevantGames.forEach(g => {
      const hour = extractHour(g);
      if (hour === null) return;
      if (!hourData[hour]) hourData[hour] = { wins: 0, total: 0, acc: 0, accN: 0 };
      hourData[hour].total++;
      const color = detectUserColor(g, username) ?? "white";
      if (isWinForColor(g.result, color)) hourData[hour].wins++;
      if (g.eval) {
        hourData[hour].acc += (color === "black" ? g.eval.accuracy.black : g.eval.accuracy.white);
        hourData[hour].accN++;
      }
    });

    const hourStats: HourStat[] = Array.from({ length: 24 }, (_, h) => {
      const d = hourData[h] ?? { wins: 0, total: 0, acc: 0, accN: 0 };
      const suffix = h < 12 ? "AM" : "PM";
      const label = `${h === 0 ? 12 : h > 12 ? h - 12 : h}${suffix}`;
      return {
        hour: h,
        label,
        games: d.total,
        winRate: d.total ? (d.wins / d.total) * 100 : 0,
        accuracy: d.accN ? d.acc / d.accN : 0,
      };
    });

    // ── Day of week ───────────────────────────────────────────────────────
    const dayData: Record<number, { wins: number; total: number; acc: number; accN: number }> = {};

    allRelevantGames.forEach(g => {
      const day = extractDayOfWeek(g);
      if (day === null) return;
      if (!dayData[day]) dayData[day] = { wins: 0, total: 0, acc: 0, accN: 0 };
      dayData[day].total++;
      const color = detectUserColor(g, username) ?? "white";
      if (isWinForColor(g.result, color)) dayData[day].wins++;
      if (g.eval) {
        dayData[day].acc += (color === "black" ? g.eval.accuracy.black : g.eval.accuracy.white);
        dayData[day].accN++;
      }
    });

    const dayOfWeekStats: DayOfWeekStat[] = Array.from({ length: 7 }, (_, d) => {
      const data = dayData[d] ?? { wins: 0, total: 0, acc: 0, accN: 0 };
      return {
        day: DAYS[d],
        short: DAYS_SHORT[d],
        games: data.total,
        winRate: data.total ? (data.wins / data.total) * 100 : 0,
        accuracy: data.accN ? data.acc / data.accN : 0,
      };
    });

    // ── Combine ───────────────────────────────────────────────────────────
    const totalAccuracy = analyzedGames.length === 0 ? 0 :
      analyzedGames.reduce((s, g) => {
        const color = detectUserColor(g, username);
        return s + (color === "black" ? (g.eval?.accuracy?.black ?? 0) : (g.eval?.accuracy?.white ?? 0));
      }, 0) / analyzedGames.length;

    return {
      totalGames: allRelevantGames.length,
      analyzedGames: analyzedGames.length,
      avgAccuracy: totalAccuracy,
      asWhite,
      asBlack,
      accuracyOverTime,
      moveQuality,
      openingsAsWhite,
      openingsAsBlack,
      phaseAccuracy,
      terminationTypes,
      castlingStats,
      hourStats,
      dayOfWeekStats,
    };
  }, [analyzedGames, allRelevantGames, username]);

  // ── Batch analysis ────────────────────────────────────────────────────────

  const startBatchAnalysis = useCallback(async () => {
    if (unanalyzedGames.length === 0 || isAnalyzing) return;
    const cloudUnanalyzedIds = cloudGames
      .filter((game) => !game.eval)
      .map((game) => game.id);
    if (cloudUnanalyzedIds.length === 0) return;

    setIsAnalyzing(true);
    setCloudJobStatus("queued");
    setProgress(0);

    try {
      const jobIds = await queueCloudAnalysis(cloudUnanalyzedIds, 12, 1);
      const pending = new Set(jobIds);
      let completedJobs = 0;

      while (pending.size > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1250));
        setCloudJobStatus("processing");

        for (const jobId of Array.from(pending)) {
          const job = await getCloudAnalysisJob(jobId);
          if (job.status === "completed" || job.status === "failed") {
            pending.delete(jobId);
            completedJobs += 1;
            setProgress((completedJobs / jobIds.length) * 100);
          }
        }
      }

      await refreshCloudGames();
    } catch (err) {
      console.error("Cloud analysis failed", err);
      setFetchError(err instanceof Error ? err.message : "Cloud analysis failed");
    } finally {
      setCloudJobStatus("idle");
      setIsAnalyzing(false);
      setProgress(0);
    }
  }, [cloudGames, unanalyzedGames.length, isAnalyzing, refreshCloudGames]);

  return {
    stats,
    isAnalyzing,
    isFetching,
    fetchError,
    progress,
    startBatchAnalysis,
    fetchExternalGames,
    analysisTarget,
    setAnalysisTarget,
    unanalyzedCount: unanalyzedGames.length,
    analyzedCount: analyzedGames.length,
    totalCount: allRelevantGames.length,
    cloudJobStatus,
    isReady: isDbReady,
  };
};
