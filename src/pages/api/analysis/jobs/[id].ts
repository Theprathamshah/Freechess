import { NextApiRequest, NextApiResponse } from "next";
import { requireUserId } from "@/server/api/auth";
import { getAnalysisJob } from "@/server/insights/repository";

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

  const id = req.query.id;
  if (typeof id !== "string") {
    res.status(400).json({ error: "Invalid job id" });
    return;
  }

  try {
    const job = await getAnalysisJob(userId, id);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    res.setHeader("Cache-Control", "private, no-store");
    res.status(200).json({ job });
  } catch (error) {
    console.error("Failed to get analysis job", error);
    res.status(500).json({ error: "Failed to get analysis job" });
  }
}
