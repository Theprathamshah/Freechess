CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('lichess', 'chess.com')),
  external_game_id TEXT NOT NULL,
  pgn_text TEXT NOT NULL,
  pgn_r2_key TEXT NOT NULL,
  pgn_sha256 TEXT NOT NULL,
  played_at TIMESTAMPTZ NULL,
  white_name TEXT NOT NULL,
  white_rating INTEGER NULL,
  black_name TEXT NOT NULL,
  black_rating INTEGER NULL,
  result TEXT NULL,
  time_control TEXT NULL,
  url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source, external_game_id),
  UNIQUE (user_id, pgn_sha256)
);

CREATE TABLE IF NOT EXISTS analysis_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  provider TEXT NOT NULL DEFAULT 'lichess-cloud-eval',
  depth INTEGER NOT NULL DEFAULT 12,
  multi_pv INTEGER NOT NULL DEFAULT 1,
  retries INTEGER NOT NULL DEFAULT 0,
  error TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analysis_results (
  game_id UUID PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,
  eval_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_games_user_played_at ON games(user_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON analysis_jobs(status, created_at ASC);
