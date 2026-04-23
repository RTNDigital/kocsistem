"use client";

import { useQuery } from "@tanstack/react-query";
import { listBoardsWithSprints } from "@/lib/queries";

export function useBoardsWithSprints() {
  return useQuery({
    queryKey: ["boards-with-sprints"],
    queryFn: () => listBoardsWithSprints(),
  });
}
