import { NextApiRequest, NextApiResponse } from "next";
import { ExternalSource, LoadedGame } from "@/types/game";
import { requireUserId } from "@/server/api/auth";
import { ingestExternalGames } from "@/server/insights/repository";

interface IngestBody {
  source: ExternalSource;
  games: LoadedGame[];
}

const isSource = (value: unknown): value is ExternalSource =>
  value === "lichess" || value === "chess.com";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const userId = requireUserId(req, res);
  if (!userId) return;

  const body = req.body as IngestBody;
  if (!isSource(body?.source) || !Array.isArray(body?.games)) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const filteredGames = body.games.filter((game) => game.id && game.pgn);
  if (filteredGames.length === 0) {
    res.status(400).json({ error: "No valid games to ingest" });
    return;
  }

  try {
    const result = await ingestExternalGames(userId, body.source, filteredGames);
    res.status(200).json(result);
  } catch (error) {
    console.error("Ingest failed", error);
    res.status(500).json({ error: "Failed to ingest games" });
  }
}
