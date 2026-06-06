export interface Puzzle {
  id: string;
  fen: string;
  moves: string[];
  rating: number;
  theme: "Tactics" | "Mate" | "Endgame";
  title: string;
  description: string;
}

export const PUZZLES: Puzzle[] = [
  {
    id: "00008",
    fen: "r6k/pp2r2p/4Rp1Q/3p4/8/1P1P2R1/1PP2PPP/6K1 b - - 0 24",
    moves: ["e7e6", "h6g7"],
    rating: 600,
    theme: "Mate",
    title: "Simple Mate in One",
    description: "Black has captured the Rook. Find the mating move!"
  },
  {
    id: "000aY",
    fen: "r2qkb1r/pp2pppp/2np1n2/1B6/4P1b1/2N2N2/PPP2PPP/R1BQK2R w KQkq - 5 7",
    moves: ["h2h3", "g4f3", "d1f3"],
    rating: 800,
    theme: "Tactics",
    title: "Recapture the Bishop",
    description: "Force the exchange and maintain a solid center."
  },
  {
    id: "000D3",
    fen: "3r2k1/ppq2p1p/2p3p1/8/2P1Rn2/1P3N1P/P4PP1/2Q3K1 b - - 4 25",
    moves: ["f4d3", "c1h6"],
    rating: 900,
    theme: "Tactics",
    title: "Repositioning the Knight",
    description: "Find a safe, active square for your knight."
  },
  {
    id: "0015q",
    fen: "8/p1p2r1k/1p1p2p1/3Pn2p/2P1N3/1P4P1/P5KP/4R3 w - - 0 31",
    moves: ["e4g5", "h7g7", "g5f7"],
    rating: 1050,
    theme: "Tactics",
    title: "Royal Fork",
    description: "Find the tactical jump that wins exchange."
  },
  {
    id: "002B4",
    fen: "8/p1N2pk1/1p2r1p1/7p/P6P/5bP1/R4P2/6K1 b - - 2 37",
    moves: ["e6e1", "g1h2", "e1h1"],
    rating: 1100,
    theme: "Mate",
    title: "Rook Checkmate",
    description: "Force the enemy king into the corner for a quick checkmate."
  },
  {
    id: "0012A",
    fen: "r1b2rk1/pp3ppp/2nq4/3p4/4n3/P1NBPN2/1P3PPP/R2QK2R w KQ - 0 11",
    moves: ["d3e4", "d5e4", "d1d6"],
    rating: 1200,
    theme: "Tactics",
    title: "Winning the Queen",
    description: "Look for pins and loose pieces in the center."
  },
  {
    id: "0017i",
    fen: "r2qk2r/ppp2ppp/2n1bn2/2bpp3/4P3/2PP1N2/PPQ1BPPP/RNB2RK1 b kq - 5 7",
    moves: ["d5e4", "d3e4", "d8e7"],
    rating: 1300,
    theme: "Tactics",
    title: "Center Tension Release",
    description: "Solve the tension in the center pawns."
  },
  {
    id: "0022l",
    fen: "r2q1rk1/pb3ppp/3bp3/1p1nN3/2pP4/2P3B1/PPB1QPPP/R4RK1 b - - 5 15",
    moves: ["d6e5", "e2e5", "d8e7"],
    rating: 1350,
    theme: "Tactics",
    title: "Active Knight Trade",
    description: "Exchange the active opposing knight to free up your position."
  },
  {
    id: "000jc",
    fen: "r2q1rk1/1pp1bppp/p1np1n2/4p3/4P1b1/1PNP1N2/PBP1BPPP/R2Q1RK1 w - - 0 9",
    moves: ["f3e5", "c6e5", "e2g4", "e5g4"],
    rating: 1400,
    theme: "Tactics",
    title: "Tactical Pawn Grab",
    description: "Exploit the undefended bishop on g4 through a temporary sacrifice."
  },
  {
    id: "0029b",
    fen: "3q1rk1/r4pbp/p2p2p1/1p1P4/4Np2/P1P4Q/1P4PP/R4RK1 w - - 0 19",
    moves: ["f1f4", "f7f5", "e4f2"],
    rating: 1450,
    theme: "Tactics",
    title: "F-file Control",
    description: "Recapture the pawn on f4 and fortify your kingside defense."
  },
  {
    id: "002E4",
    fen: "2r1r1k1/pp3ppp/3B2n1/8/8/2P1RP2/P1PQ2PP/qNK5 b - - 0 19",
    moves: ["e8e3", "d2e3", "a1a2"],
    rating: 1500,
    theme: "Tactics",
    title: "Rook Exchange",
    description: "Trade off pieces to release pressure and improve pawn structure."
  },
  {
    id: "001c9",
    fen: "4kb1r/p2n1ppp/4p3/4Pb2/3P4/2r1BN2/P2KBPPP/R6R b k - 1 14",
    moves: ["f8b4", "a2a3", "c3c2", "d2d1"],
    rating: 1550,
    theme: "Tactics",
    title: "Discovered Double Check",
    description: "Use the rook on c3 and bishop on b4 to create a devastating double check."
  },
  {
    id: "0021q",
    fen: "2r1r1k1/pp3ppp/3B1n2/2P5/3qp1n1/P5P1/QP1NPPBP/R4RK1 w - - 5 19",
    moves: ["e2e3", "d4d2", "a1d1", "d2c2"],
    rating: 1600,
    theme: "Tactics",
    title: "Chasing the Queen",
    description: "Force the queen to relocate while developing your rook's activity."
  },
  {
    id: "0026e",
    fen: "6k1/R5P1/8/8/6r1/1K6/8/8 w - - 1 73",
    moves: ["b3c3", "g4g7", "c3d4"],
    rating: 1750,
    theme: "Endgame",
    title: "Rook Endgame Draw",
    description: "Improve your king position to defend the rook endgame."
  },
  {
    id: "002Bw",
    fen: "3r4/pQ2nk2/1p2q3/1P3p2/P1p3p1/6Bp/5K1P/3B1R2 b - - 1 43",
    moves: ["d8d2", "f2g1", "e6e3", "g3f2", "d2f2", "f1f2"],
    rating: 1850,
    theme: "Tactics",
    title: "Infiltration Tactics",
    description: "Intrude the enemy base with your rook and queen to create threats."
  }
];
