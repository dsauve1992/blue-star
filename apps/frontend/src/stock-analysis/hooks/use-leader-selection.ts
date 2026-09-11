import { useState, useEffect } from "react";
import {
  leaderTickerFullName,
  type MomentumLeader,
} from "../api/momentum-leaders.client";

export function useLeaderSelection(leaders: MomentumLeader[]) {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  const currentIndex = leaders.findIndex(
    (l) => leaderTickerFullName(l) === selectedTicker,
  );

  useEffect(() => {
    if (leaders.length > 0 && currentIndex === -1) {
      setSelectedTicker(leaderTickerFullName(leaders[0]));
    }
  }, [leaders, currentIndex]);

  return { selectedTicker, setSelectedTicker, currentIndex };
}
