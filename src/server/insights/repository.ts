import { PoolClient } from "pg";
import { GameEval } from "@/types/eval";
import { CloudGame, ExternalSource, LoadedGame } from "@/types/game";
import { sql, withTransaction } from "../db";
import { getPgnSha256, getR2PgnKey } from "./storage";
import { putPgnObject } from "../r2";

interface CloudGameRow {
  id: string;
  user_id: string;
  source: ExternalSource;
  external_game_id: string;
  pgn_text: string;
  pgn_r2_key: string;
  pgn_sha256: string;
  played_at: string | null;
  white_name: string;
  white_rating: number | null;
  black_name: string;
  black_rating: number | null;
  result: string | null;
  time_control: string | null;
  url: string | null;
  created_at: string;
  updated_at: string;
}

const toCloudGame = (row: CloudGameRow): CloudGame => ({
  id: row.id,
  userId: row.user_id,
  source: row.source,
  externalGameId: row.external_game_id,
  pgn: row.pgn_text,
  pgnR2Key: row.pgn_r2_key,
  pgnSha256: row.pgn_sha256,
  playedAt: row.played_at,
  whiteName: row.white_name,
  whiteRating: row.white_rating,
  blackName: row.black_name,
  blackRating: row.black_rating,
  result: row.result,
  timeControl: row.time_control,
  url: row.url,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const ensureUser = async (client: PoolClient, userId: string): Promise<void> => {
  await client.query(
    `INSERT INTO users (id) VALUES ($1)
     ON CONFLICT (id) DO NOTHING`,
    [userId]
  );
};

const parsePlayedAt = (date?: string): string | null => {
  if (!date) return null;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

export const ingestExternalGames = async (
  userId: string,
  source: ExternalSource,
  games: LoadedGame[]
): Promise<{ inserted: number; updated: number; games: CloudGame[] }> => {
  const cloudGames: CloudGame[] = [];
  let inserted = 0;
  let updated = 0;

  await withTransaction(async (client) => {
    await ensureUser(client, userId);

    for (const game of games) {
      const pgnSha = getPgnSha256(game.pgn);
      const key = getR2PgnKey(userId, source, game.id);
      await putPgnObject(key, game.pgn);

      const res = await client.query<CloudGameRow>(
        `INSERT INTO games (
          user_id, source, external_game_id, pgn_r2_key, pgn_sha256, played_at,
          pgn_text,
          white_name, white_rating, black_name, black_rating, result, time_control, url, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,
          $7,$8,$9,$10,$11,$12,$13,$14, NOW()
        )
        ON CONFLICT (source, external_game_id)
        DO UPDATE SET
          pgn_text = EXCLUDED.pgn_text,
          pgn_r2_key = EXCLUDED.pgn_r2_key,
          pgn_sha256 = EXCLUDED.pgn_sha256,
          played_at = EXCLUDED.played_at,
          white_name = EXCLUDED.white_name,
          white_rating = EXCLUDED.white_rating,
          black_name = EXCLUDED.black_name,
          black_rating = EXCLUDED.black_rating,
          result = EXCLUDED.result,
          time_control = EXCLUDED.time_control,
          url = EXCLUDED.url,
          updated_at = NOW()
        RETURNING *`,
        [
          userId,
          source,
          game.id,
          key,
          pgnSha,
          parsePlayedAt(game.date),
          game.pgn,
          game.white.name,
          game.white.rating ?? null,
          game.black.name,
          game.black.rating ?? null,
          game.result ?? null,
          game.timeControl ?? null,
          game.url ?? null,
        ]
      );
      const row = res.rows[0];
      if (res.rowCount > 0) {
        if (row.created_at === row.updated_at) inserted++;
        else updated++;
      }
      cloudGames.push(toCloudGame(row));
    }
  });

  return { inserted, updated, games: cloudGames };
};

export const listCloudGames = async (
  userId: string,
  options: {
    source?: ExternalSource | "all";
    limit?: number;
    offset?: number;
    includeEval?: boolean;
  } = {}
): Promise<CloudGame[]> => {
  const source = options.source ?? "all";
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);
  const offset = Math.max(options.offset ?? 0, 0);

  const query = options.includeEval
    ? `SELECT g.*, ar.eval_json
       FROM games g
       LEFT JOIN analysis_results ar ON ar.game_id = g.id
       WHERE g.user_id = $1 AND ($2::text = 'all' OR g.source = $2)
       ORDER BY g.played_at DESC NULLS LAST
       LIMIT $3 OFFSET $4`
    : `SELECT g.*
       FROM games g
       WHERE g.user_id = $1 AND ($2::text = 'all' OR g.source = $2)
       ORDER BY g.played_at DESC NULLS LAST
       LIMIT $3 OFFSET $4`;

  const res = await sql<CloudGameRow & { eval_json?: GameEval }>(query, [
    userId,
    source,
    limit,
    offset,
  ]);

  return res.rows.map((row) => ({
    ...toCloudGame(row),
    eval: row.eval_json,
  }));
};

export const queueAnalysisJobs = async (
  userId: string,
  gameIds: string[],
  params?: { depth?: number; multiPv?: number }
): Promise<string[]> => {
  const depth = Math.min(Math.max(params?.depth ?? 12, 8), 22);
  const multiPv = Math.min(Math.max(params?.multiPv ?? 1, 1), 5);

  const values = gameIds.map((_, i) => `($1,$${i + 2},'queued',$${gameIds.length + 2},$${gameIds.length + 3})`);
  const query = `
    INSERT INTO analysis_jobs (user_id, game_id, status, depth, multi_pv)
    VALUES ${values.join(",")}
    RETURNING id
  `;

  const res = await sql<{ id: string }>(query, [userId, ...gameIds, depth, multiPv]);
  return res.rows.map((row) => row.id);
};

export const getAnalysisJob = async (
  userId: string,
  jobId: string
): Promise<{
  id: string;
  gameId: string;
  status: string;
  provider: string;
  error: string | null;
  createdAt: string;
  updatedAt: string;
} | null> => {
  const res = await sql<{
    id: string;
    game_id: string;
    status: string;
    provider: string;
    error: string | null;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT id, game_id, status, provider, error, created_at, updated_at
     FROM analysis_jobs
     WHERE id = $1 AND user_id = $2`,
    [jobId, userId]
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    gameId: row.game_id,
    status: row.status,
    provider: row.provider,
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const getAnalysisResult = async (
  userId: string,
  gameId: string
): Promise<GameEval | null> => {
  const res = await sql<{ eval_json: GameEval }>(
    `SELECT ar.eval_json
     FROM analysis_results ar
     JOIN games g ON g.id = ar.game_id
     WHERE ar.game_id = $1 AND g.user_id = $2`,
    [gameId, userId]
  );
  return res.rows[0]?.eval_json ?? null;
};
