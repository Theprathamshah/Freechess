import { ChessComGame } from "@/types/chessCom";
import { getPaddedNumber } from "./helpers";
import { LoadedGame } from "@/types/game";

// ---------------------------------------------------------------------------
// Rate-limit safe fetcher
// Chess.com enforces ~1 req/sec unofficial. We add:
//   - 500ms enforced delay between each request
//   - Exponential backoff: 3 retries on 429 / 503
//   - sessionStorage cache keyed by URL so re-navigating never re-fetches
// ---------------------------------------------------------------------------
const CHESS_COM_DELAY_MS = 520; // slightly above 500ms to be safe
const MAX_RETRIES = 3;
const CACHE_VERSION = "v2"; // bump this to invalidate all cached data

const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

let lastChessComRequestAt = 0;

async function serialFetch(url: string, retries = 0): Promise<Response> {
  // honour minimum interval
  const sinceLastRequest = Date.now() - lastChessComRequestAt;
  if (sinceLastRequest < CHESS_COM_DELAY_MS) {
    await wait(CHESS_COM_DELAY_MS - sinceLastRequest);
  }
  lastChessComRequestAt = Date.now();

  const res = await fetch(url, { method: "GET" });

  if ((res.status === 429 || res.status === 503) && retries < MAX_RETRIES) {
    const backoff = Math.pow(2, retries) * 1000; // 1s, 2s, 4s
    await wait(backoff);
    return serialFetch(url, retries + 1);
  }

  return res;
}

async function cachedFetch(url: string): Promise<any> {
  const cacheKey = `${CACHE_VERSION}:${url}`;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch { /* sessionStorage not available */ }

  const res = await serialFetch(url);
  const data = await res.json();

  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(data));
  } catch { /* storage full or unavailable */ }

  return data;
}

// ---------------------------------------------------------------------------

export const getChessComUserRecentGames = async (
  username: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _signal?: AbortSignal
): Promise<LoadedGame[]> => {
  const date = new Date();
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const paddedMonth = getPaddedNumber(month);

  const url = `https://api.chess.com/pub/player/${username}/games/${year}/${paddedMonth}`;
  const data = await cachedFetch(url);

  if (
    !data?.games &&
    data?.message !== "Date cannot be set in the future"
  ) {
    throw new Error("Error fetching games from Chess.com");
  }

  const games: ChessComGame[] = data?.games ?? [];

  if (games.length < 50) {
    const previousMonth = month === 1 ? 12 : month - 1;
    const previousPaddedMonth = getPaddedNumber(previousMonth);
    const yearToFetch = previousMonth === 12 ? year - 1 : year;

    const prevUrl = `https://api.chess.com/pub/player/${username}/games/${yearToFetch}/${previousPaddedMonth}`;
    const dataPreviousMonth = await cachedFetch(prevUrl);
    games.push(...(dataPreviousMonth?.games ?? []));
  }

  const gamesToReturn = games
    .filter((game) => game.pgn && game.end_time)
    .sort((a, b) => b.end_time - a.end_time)
    .slice(0, 50)
    .map(formatChessComGame);

  return gamesToReturn;
};

export const getChessComUserAvatar = async (
  username: string
): Promise<string | null> => {
  const usernameParam = encodeURIComponent(username.trim().toLowerCase());

  const res = await fetch(`https://api.chess.com/pub/player/${usernameParam}`);
  const data = await res.json();
  const avatarUrl = data?.avatar;

  return typeof avatarUrl === "string" ? avatarUrl : null;
};

const formatChessComGame = (data: ChessComGame): LoadedGame => {
  const result = data.pgn.match(/\[Result "(.*?)"]/)?.[1];
  const movesNb = data.pgn.match(/\d+?\. /g)?.length;

  return {
    id: data.uuid || data.url?.split("/").pop() || data.id,
    pgn: data.pgn || "",
    white: {
      name: data.white?.username || "White",
      rating: data.white?.rating || 0,
      title: data.white?.title,
    },
    black: {
      name: data.black?.username || "Black",
      rating: data.black?.rating || 0,
      title: data.black?.title,
    },
    result,
    timeControl: getGameTimeControl(data),
    date: data.end_time
      ? new Date(data.end_time * 1000).toISOString()
      : undefined,
    movesNb: movesNb ? movesNb * 2 : undefined,
    url: data.url,
  };
};

const getGameTimeControl = (game: ChessComGame): string | undefined => {
  const rawTimeControl = game.time_control;
  if (!rawTimeControl) return undefined;

  const [firstPart, secondPart] = rawTimeControl.split("+");
  if (!firstPart) return undefined;

  const timeControl = Number(firstPart);
  const increment = secondPart ? `+${secondPart}` : "";
  if (timeControl < 60) return `${timeControl}s${increment}`;

  if (timeControl < 3600) {
    const minutes = Math.floor(timeControl / 60);
    const seconds = timeControl % 60;

    return seconds
      ? `${minutes}m${getPaddedNumber(seconds)}s${increment}`
      : `${minutes}m${increment}`;
  }

  const hours = Math.floor(timeControl / 3600);
  const minutes = Math.floor((timeControl % 3600) / 60);
  return minutes
    ? `${hours}h${getPaddedNumber(minutes)}m${increment}`
    : `${hours}h${increment}`;
};
