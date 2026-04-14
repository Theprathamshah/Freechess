import { useLocalStorage } from "./useLocalStorage";

const STORAGE_KEY = "insights_username";

/** Persist the player's username in localStorage so Insights
 *  can identify which color they played in every game. */
export const useInsightsUsername = () => {
  return useLocalStorage<string>(STORAGE_KEY, "");
};
