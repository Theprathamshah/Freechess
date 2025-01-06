import { Grid2 as Grid, Typography } from "@mui/material";
import CapturedPieces from "./capturedPieces";
import { PrimitiveAtom, useAtomValue } from "jotai";
import { Chess } from "chess.js";
import { Color } from "@/types/enums";
import { usePlayersNames } from "@/hooks/usePlayerNames";
import { useMemo } from "react";

interface Props {
  gameAtom: PrimitiveAtom<Chess>;
  color: Color;
}

export const Player = ({ gameAtom, color }: Props) => {
  const { whiteName, whiteElo, blackName, blackElo } =
    usePlayersNames(gameAtom);

  const playerName = useMemo(() => {
    if (color === Color.White) {
      return whiteElo ? `${whiteName} (${whiteElo})` : whiteName;
    }
    return blackElo ? `${blackName} (${blackElo})` : blackName;
  }, [color, whiteName, whiteElo, blackName, blackElo]);

  const game = useAtomValue(gameAtom);

  const clock = useMemo(() => {
    const comment = game.getComment();
    if (!comment) return undefined;

    const match = comment.match(/\[%clk (\d+):(\d+):(\d+)(?:\.(\d*))?\]/);
    if (!match) return undefined;

    return {
      hours: parseInt(match[1]),
      minutes: parseInt(match[2]),
      seconds: parseInt(match[3]),
      tenths: match[4] ? parseInt(match[4]) : 0,
    };
  }, [game]);
  console.log(clock);

  return (
    <Grid
      container
      justifyContent="center"
      alignItems="center"
      columnGap={2}
      size={12}
    >
      <Typography>{playerName}</Typography>

      <CapturedPieces gameAtom={gameAtom} color={color} />
    </Grid>
  );
};
