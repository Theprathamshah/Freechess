import { NextApiRequest, NextApiResponse } from "next";
import { requireUserId } from "@/server/api/auth";
import { getAnalysisResult } from "@/server/insights/repository";

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

  const gameId = req.query.gameId;
  if (typeof gameId !== "string") {
    res.status(400).json({ error: "Invalid game id" });
    return;
  }

  try {
    const evalData = await getAnalysisResult(userId, gameId);
    if (!evalData) {
      res.status(404).json({ error: "Analysis result not found" });
      return;
    }
    res.setHeader("Cache-Control", "private, no-store");
    res.status(200).json({ eval: evalData });
  } catch (error) {
    console.error("Failed to load analysis result", error);
    res.status(500).json({ error: "Failed to load analysis result" });
  }
}
