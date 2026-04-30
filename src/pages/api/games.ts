import { NextApiRequest, NextApiResponse } from "next";
import { ExternalSource } from "@/types/game";
import { requireUserId } from "@/server/api/auth";
import { listCloudGames } from "@/server/insights/repository";

const parseSource = (value: unknown): ExternalSource | "all" => {
  if (value === "lichess" || value === "chess.com") return value;
  return "all";
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const userId = requireUserId(req, res);
  if (!userId) return;

  const source = parseSource(req.query.source);
  const limit = Number(req.query.limit ?? 100);
  const offset = Number(req.query.offset ?? 0);
  const includeEval = req.query.includeEval === "true";

  try {
    const games = await listCloudGames(userId, { source, limit, offset, includeEval });
    res.setHeader("Cache-Control", "private, no-store");
    res.status(200).json({ games });
  } catch (error) {
    console.error("Failed to list games", error);
    res.status(500).json({ error: "Failed to list games" });
  }
}
