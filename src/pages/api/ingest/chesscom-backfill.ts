import { NextApiRequest, NextApiResponse } from "next";
import { getChessComUserGamesForMonth } from "@/lib/chessCom";
import { ChessComGame } from "@/types/chessCom";
import { LoadedGame } from "@/types/game";
import { requireUserId } from "@/server/api/auth";
import { ingestExternalGames } from "@/server/insights/repository";

const formatChessComRawGame = (game: ChessComGame): LoadedGame => {
  const result = game.pgn?.match(/\[Result "(.*?)"]/)?.[1];
  const movesNb = game.pgn?.match(/\d+?\. /g)?.length;
  return {
    id: game.uuid || game.url?.split("/").pop() || game.id,
    pgn: game.pgn || "",
    white: {
      name: game.white?.username || "White",
      rating: game.white?.rating || 0,
      title: game.white?.title,
    },
    black: {
      name: game.black?.username || "Black",
      rating: game.black?.rating || 0,
      title: game.black?.title,
    },
    result,
    timeControl: game.time_control,
    date: game.end_time ? new Date(game.end_time * 1000).toISOString() : undefined,
    movesNb: movesNb ? movesNb * 2 : undefined,
    url: game.url,
  };
};

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

  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const months = Number(req.body?.months ?? 6);
  if (!username) {
    res.status(400).json({ error: "username is required" });
    return;
  }

  const boundedMonths = Math.min(Math.max(months, 1), 60);
  const now = new Date();
  const allGames: LoadedGame[] = [];

  try {
    for (let i = 0; i < boundedMonths; i++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const monthGames = await getChessComUserGamesForMonth(
        username,
        d.getUTCFullYear(),
        d.getUTCMonth() + 1
      );
      allGames.push(
        ...monthGames
          .filter((game) => game.pgn && game.end_time)
          .map(formatChessComRawGame)
      );
    }

    const result = await ingestExternalGames(userId, "chess.com", allGames);
    res.setHeader("Cache-Control", "private, no-store");
    res.status(200).json({
      months: boundedMonths,
      fetchedGames: allGames.length,
      ...result,
    });
  } catch (error) {
    console.error("Chess.com backfill failed", error);
    res.status(500).json({ error: "Backfill failed" });
  }
}
