import { NextApiRequest, NextApiResponse } from "next";
import { processNextAnalysisJob } from "@/server/analysis/processor";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const workerToken = process.env.ANALYSIS_WORKER_TOKEN;
  if (!workerToken || req.headers.authorization !== `Bearer ${workerToken}`) {
    res.status(401).json({ error: "Unauthorized worker invocation" });
    return;
  }

  try {
    const result = await processNextAnalysisJob();
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(result);
  } catch (error) {
    console.error("Worker tick failed", error);
    res.status(500).json({ error: "Worker tick failed" });
  }
}
