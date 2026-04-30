import { GameEval } from "./eval";

export interface Game {
  id: number;
  pgn: string;
  event?: string;
  site?: string;
  date?: string;
  round?: string;
  white: Player;
  black: Player;
  result?: string;
  eval?: GameEval;
  termination?: string;
  timeControl?: string;
}

export interface Player {
  name: string;
  rating?: number;
  avatarUrl?: string;
  title?: string;
}

export interface LoadedGame {
  id: string;
  pgn: string;
  date?: string;
  white: Player;
  black: Player;
  result?: string;
  timeControl?: string;
  movesNb?: number;
  url?: string;
}

export type ExternalSource = "lichess" | "chess.com";

export interface CloudGame {
  id: string;
  userId: string;
  source: ExternalSource;
  externalGameId: string;
  pgn: string;
  pgnR2Key: string;
  pgnSha256: string;
  playedAt: string | null;
  whiteName: string;
  whiteRating: number | null;
  blackName: string;
  blackRating: number | null;
  result: string | null;
  timeControl: string | null;
  url: string | null;
  createdAt: string;
  updatedAt: string;
  eval?: GameEval;
}
