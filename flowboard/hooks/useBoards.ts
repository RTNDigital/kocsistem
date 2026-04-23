"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { listBoards, recentActivity } from "@/lib/queries";
import { createBoard, updateBoard, deleteBoard } from "@/lib/mutations";
import type { Board } from "@/types/domain";

export function useBoards() {
  return useQuery({
    queryKey: ["boards"],
    queryFn: () => listBoards(),
  });
}

export function useRecentActivity(limit = 8) {
  return useQuery({
    queryKey: ["activity", limit],
    queryFn: () => recentActivity(limit),
  });
}

export function useCreateBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { title: string; ownerId?: string; color?: string }) =>
      createBoard(args),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["boards"] }),
  });
}

export function useUpdateBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, patch }: { boardId: string; patch: Partial<Board> }) =>
      updateBoard(boardId, patch),
    onMutate: async ({ boardId, patch }) => {
      await qc.cancelQueries({ queryKey: ["boards"] });
      const prev = qc.getQueryData<Board[]>(["boards"]);
      qc.setQueryData<Board[]>(["boards"], (old) =>
        old?.map((b) => (b.id === boardId ? { ...b, ...patch } : b))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["boards"], ctx.prev);
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: ["boards"] });
      qc.invalidateQueries({ queryKey: ["board", vars.boardId] });
    },
  });
}

export function useDeleteBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (boardId: string) => deleteBoard(boardId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["boards"] }),
  });
}
