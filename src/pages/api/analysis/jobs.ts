import { NextApiRequest, NextApiResponse } from "next";
import { requireUserId } from "@/server/api/auth";
import { queueAnalysisJobs } from "@/server/insights/repository";

interface QueueBody {
  gameIds: string[];
  depth?: number;
  multiPv?: number;
}

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

  const body = req.body as QueueBody;
  if (!Array.isArray(body?.gameIds) || body.gameIds.length === 0) {
    res.status(400).json({ error: "gameIds must be a non-empty array" });
    return;
  }

  try {
    const jobIds = await queueAnalysisJobs(userId, body.gameIds, {
      depth: body.depth,
      multiPv: body.multiPv,
    });
    res.status(200).json({ jobIds });
  } catch (error) {
    console.error("Failed to queue analysis jobs", error);
    res.status(500).json({ error: "Failed to queue jobs" });
  }
}
