import { GameEval } from "@/types/eval";
import { CloudGame, ExternalSource, LoadedGame } from "@/types/game";

const JSON_HEADERS = {
  "Content-Type": "application/json",
};

export const ingestGamesToCloud = async (
  source: ExternalSource,
  games: LoadedGame[]
): Promise<{ inserted: number; updated: number; games: CloudGame[] }> => {
  const res = await fetch("/api/ingest/games", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ source, games }),
  });
  console.log('result is', JSON.stringify(res, null, 2))
  if (!res.ok) {
    throw new Error("Failed to ingest games");
  }
  return res.json();
};

export const fetchCloudGames = async (
  source: ExternalSource | "all",
  includeEval = true
): Promise<CloudGame[]> => {
  const params = new URLSearchParams({
    source,
    includeEval: String(includeEval),
  });
  const res = await fetch(`/api/games?${params.toString()}`);
  console.log('result is', JSON.stringify(res, null, 2))
  if (!res.ok) return [];

  const body = (await res.json()) as { games: CloudGame[] };
  return body.games;
};

export const queueCloudAnalysis = async (
  gameIds: string[],
  depth = 12,
  multiPv = 1
): Promise<string[]> => {
  const res = await fetch("/api/analysis/jobs", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ gameIds, depth, multiPv }),
  });
  if (!res.ok) throw new Error("Failed to queue analysis");
  const body = (await res.json()) as { jobIds: string[] };
  return body.jobIds;
};

export const getCloudAnalysisJob = async (jobId: string): Promise<{
  id: string;
  gameId: string;
  status: string;
  error: string | null;
}> => {
  const res = await fetch(`/api/analysis/jobs/${jobId}`);
  if (!res.ok) throw new Error("Failed to fetch job status");
  const body = (await res.json()) as {
    job: { id: string; gameId: string; status: string; error: string | null };
  };
  return body.job;
};

export const getCloudAnalysisResult = async (gameId: string): Promise<GameEval> => {
  const res = await fetch(`/api/analysis/results/${gameId}`);
  if (!res.ok) throw new Error("Failed to fetch analysis result");
  const body = (await res.json()) as { eval: GameEval };
  return body.eval;
};
