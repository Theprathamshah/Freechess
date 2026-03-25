import { useState, useEffect, useCallback } from "react";

interface UseTTSResult {
  isSupported: boolean;
  isPlaying: boolean;
  speak: () => void;
  stop: () => void;
}

const preprocessChessTextForTTS = (text: string): string => {
  if (!text) return text;
  
  let processed = text;
  
  // Handle castling first
  processed = processed.replace(/\bO-O-O\b/g, "castles queen side");
  processed = processed.replace(/\bO-O\b/g, "castles king side");
  
  const pieceNames: Record<string, string> = {
    K: "King ",
    Q: "Queen ",
    R: "Rook ",
    B: "Bishop ",
    N: "Knight "
  };
  
  // Match standard chess notation (e.g., Nxd4, exd5, a8=Q+, Rae1#)
  const sanRegex = /\b([KQRBN]?)([a-h]?[1-8]?)(x?)([a-h][1-8])(?:=([QRBN]))?([\+#]?)(?!\w)/g;
  
  processed = processed.replace(sanRegex, (_, piece, disambiguation, capture, dest, promotion, check) => {
    let res = "";
    if (piece) res += pieceNames[piece];
    if (disambiguation) res += disambiguation + " ";
    if (capture) res += "takes ";
    res += dest;
    if (promotion) res += " equals " + pieceNames[promotion].trim();
    if (check === "+") res += " check";
    if (check === "#") res += " checkmate";
    
    return res.trim(); // Trim extra spaces just in case
  });
  
  return processed.replace(/\s+/g, " ").trim();
};

export const useTTS = (text: string | undefined): UseTTSResult => {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setIsSupported(true);

      const updateVoices = () => {
        setVoices(window.speechSynthesis.getVoices());
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  }, [isSupported]);

  useEffect(() => {
    stop();
  }, [text, stop]);

  const speak = useCallback(() => {
    if (!isSupported || !text) return;

    stop();

    const processedText = preprocessChessTextForTTS(text);
    const speech = new SpeechSynthesisUtterance(processedText);
    speech.lang = "en-US";
    speech.rate = 0.95;
    speech.pitch = 1.05;
    let selectedVoice = null;
    const preferredVoices = [
      "Google US English",
      "Google UK English Female",
      "Microsoft Zira",
      "Microsoft Aria",
      "Samantha",
      "Karen",
      "Daniel",
    ];

    for (const pref of preferredVoices) {
      selectedVoice = voices.find((v) => v.name.includes(pref));
      if (selectedVoice) break;
    }

    if (!selectedVoice) {
      selectedVoice = voices.find(
        (v) => v.lang.startsWith("en") && (v.name.includes("Female") || v.name.includes("Woman"))
      );
    }
    if (!selectedVoice) {
      selectedVoice = voices.find((v) => v.lang.startsWith("en"));
    }

    if (selectedVoice) {
      speech.voice = selectedVoice;
    }

    speech.onstart = () => setIsPlaying(true);
    speech.onend = () => setIsPlaying(false);
    speech.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(speech);
  }, [isSupported, text, stop, voices]);

  return {
    isSupported,
    isPlaying,
    speak,
    stop,
  };
};
