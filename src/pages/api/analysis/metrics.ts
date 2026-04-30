import { NextApiRequest, NextApiResponse } from "next";
import { requireUserId } from "@/server/api/auth";
import { sql } from "@/server/db";

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

  try {
    const counts = await sql<{ status: string; count: string }>(
      `SELECT status, COUNT(*)::text AS count
       FROM analysis_jobs
       WHERE user_id = $1
       GROUP BY status`,
      [userId]
    );
    const durations = await sql<{ avg_seconds: string | null }>(
      `SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)))::text AS avg_seconds
       FROM analysis_jobs
       WHERE user_id = $1 AND status = 'completed'`,
      [userId]
    );

    res.setHeader("Cache-Control", "private, max-age=15, stale-while-revalidate=30");
    res.status(200).json({
      counts: counts.rows.reduce<Record<string, number>>((acc, row) => {
        acc[row.status] = Number(row.count);
        return acc;
      }, {}),
      avgJobSeconds: Number(durations.rows[0]?.avg_seconds ?? 0),
    });
  } catch (error) {
    console.error("Failed to load analysis metrics", error);
    res.status(500).json({ error: "Failed to load metrics" });
  }
}
