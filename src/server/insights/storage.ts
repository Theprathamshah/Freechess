import crypto from "crypto";
import { LoadedGame, ExternalSource } from "@/types/game";

export const getPgnSha256 = (pgn: string): string =>
  crypto.createHash("sha256").update(pgn).digest("hex");

export const getR2PgnKey = (
  userId: string,
  source: ExternalSource,
  externalGameId: string
): string => `users/${userId}/games/${source}/${externalGameId}.pgn`;

export const normalizeExternalGame = (
  game: LoadedGame,
  source: ExternalSource
): LoadedGame => ({
  ...game,
  id: game.id.trim(),
  pgn: game.pgn.trim(),
  url: game.url ?? (source === "lichess" ? `https://lichess.org/${game.id}` : null) ?? undefined,
});
