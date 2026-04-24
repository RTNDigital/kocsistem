"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { listBoards, recentActivity, listAllProfiles } from "@/lib/queries";
import { createBoard, updateBoard, deleteBoard, addBoardMember, removeBoardMember } from "@/lib/mutations";
import type { Board, BoardType } from "@/types/domain";

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
    mutationFn: (args: { title: string; ownerId?: string; color?: string; type?: BoardType; started_at?: string | null; estimated_finished_at?: string | null }) =>
      createBoard(args),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["boards"] });
      qc.invalidateQueries({ queryKey: ["boards-with-sprints"] });
    },
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
      qc.invalidateQueries({ queryKey: ["boards-with-sprints"] });
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

export function useAllProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: () => listAllProfiles(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useAddBoardMember(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { userId: string; role?: "editor" | "viewer" }) =>
      addBoardMember({ boardId, ...args }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board", boardId] }),
  });
}

export function useRemoveBoardMember(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => removeBoardMember({ boardId, userId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board", boardId] }),
  });
}
