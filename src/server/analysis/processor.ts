import { Chess } from "chess.js";
import { computeAccuracy } from "@/lib/engine/helpers/accuracy";
import { computeEstimatedElo } from "@/lib/engine/helpers/estimateElo";
import { getMovesClassification } from "@/lib/engine/helpers/moveClassification";
import { getLichessEval } from "@/lib/lichess";
import { EngineName } from "@/types/enums";
import { GameEval, PositionEval } from "@/types/eval";
import { sql } from "../db";
import { getPgnObject } from "../r2";

interface QueuedJob {
  id: string;
  game_id: string;
  user_id: string;
  depth: number;
  multi_pv: number;
  white_rating: number | null;
  black_rating: number | null;
  pgn_r2_key: string;
}

const buildEvaluateParamsFromPgn = (pgn: string): { fens: string[]; uciMoves: string[] } => {
  const game = new Chess();
  game.loadPgn(pgn);
  const history = game.history({ verbose: true });
  if (history.length === 0) return { fens: [new Chess().fen()], uciMoves: [] };

  const fens = history.map((move) => move.before);
  fens.push(history[history.length - 1].after);
  const uciMoves = history.map((move) => `${move.from}${move.to}${move.promotion ?? ""}`);
  return { fens, uciMoves };
};

const evaluateWithCloudProvider = async (
  fens: string[],
  uciMoves: string[],
  multiPv: number
): Promise<PositionEval[]> => {
  const raw: PositionEval[] = [];
  for (const fen of fens) {
    const evalResult = await getLichessEval(fen, multiPv);
    raw.push(evalResult);
  }
  return getMovesClassification(raw, uciMoves, fens);
};

const buildGameEval = async (
  pgn: string,
  params: { multiPv: number; depth: number; whiteRating?: number; blackRating?: number }
): Promise<GameEval> => {
  const { fens, uciMoves } = buildEvaluateParamsFromPgn(pgn);
  const positions = await evaluateWithCloudProvider(fens, uciMoves, params.multiPv);
  const accuracy = computeAccuracy(positions);
  const estimatedElo = computeEstimatedElo(positions, params.whiteRating, params.blackRating);
  return {
    positions,
    accuracy,
    estimatedElo,
    settings: {
      engine: EngineName.Stockfish17Lite,
      depth: params.depth,
      multiPv: params.multiPv,
      date: new Date().toISOString(),
    },
  };
};

export const processNextAnalysisJob = async (): Promise<{
  processed: boolean;
  jobId?: string;
  status?: "completed" | "failed";
}> => {
  const jobResult = await sql<QueuedJob>(
    `UPDATE analysis_jobs j
     SET status = 'processing', updated_at = NOW()
     FROM games g
     WHERE j.id = (
       SELECT id FROM analysis_jobs
       WHERE status = 'queued'
       ORDER BY created_at ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED
     )
     AND g.id = j.game_id
     RETURNING j.id, j.game_id, j.user_id, j.depth, j.multi_pv, g.white_rating, g.black_rating, g.pgn_r2_key`
  );

  const job = jobResult.rows[0];
  if (!job) return { processed: false };

  try {
    const pgn = await getPgnObject(job.pgn_r2_key);
    const evaluation = await buildGameEval(pgn, {
      multiPv: job.multi_pv,
      depth: job.depth,
      whiteRating: job.white_rating ?? undefined,
      blackRating: job.black_rating ?? undefined,
    });

    await sql(
      `INSERT INTO analysis_results (game_id, eval_json, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (game_id)
       DO UPDATE SET eval_json = EXCLUDED.eval_json, updated_at = NOW()`,
      [job.game_id, JSON.stringify(evaluation)]
    );

    await sql(
      `UPDATE analysis_jobs
       SET status = 'completed', error = NULL, updated_at = NOW()
       WHERE id = $1`,
      [job.id]
    );

    return { processed: true, jobId: job.id, status: "completed" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown processing error";
    await sql(
      `UPDATE analysis_jobs
       SET status = 'failed', error = $2, retries = retries + 1, updated_at = NOW()
       WHERE id = $1`,
      [job.id, message]
    );
    return { processed: true, jobId: job.id, status: "failed" };
  }
};
