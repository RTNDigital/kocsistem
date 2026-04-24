"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getBoardDetail, getActiveSprint, listSprintArchives, getSprintArchiveDetail, getLeaderboard } from "@/lib/queries";
import {
  addCard,
  addColumn,
  deleteCard,
  deleteColumn,
  moveCard,
  moveColumn,
  updateCard,
  updateColumn,
  toggleCardLabel,
  toggleCardAssignee,
  toggleCardWatcher,
  addLabel,
  updateLabel,
  deleteLabel,
  startSprint,
  completeSprint,
} from "@/lib/mutations";
import type { BoardDetail, Card, Column } from "@/types/domain";
import type { CardPriority } from "@/types/database";
import { positionAtEnd, positionForIndex } from "@/lib/ordering";

export function useBoard(boardId: string, enabled = true) {
  return useQuery({
    queryKey: ["board", boardId],
    queryFn: () => getBoardDetail(boardId),
    enabled: !!boardId && enabled,
  });
}

const key = (boardId: string) => ["board", boardId] as const;

// ----------------------------------------------------------------------------
// Cards
// ----------------------------------------------------------------------------
export function useAddCard(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { columnId: string; title: string; actorId?: string }) => {
      const detail = qc.getQueryData<BoardDetail>(key(boardId));
      const siblingsPositions = (detail?.cards ?? [])
        .filter((c) => c.column_id === args.columnId)
        .map((c) => c.position);
      return addCard({ boardId, columnId: args.columnId, title: args.title, siblingsPositions });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key(boardId) });
      qc.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

export function useUpdateCard(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      cardId,
      patch,
    }: {
      cardId: string;
      patch: { title?: string; description?: string; priority?: CardPriority | null; due_at?: string | null; start_at?: string | null; story_points?: number | null };
    }) => updateCard(cardId, patch, { boardId }),
    onMutate: async ({ cardId, patch }) => {
      await qc.cancelQueries({ queryKey: key(boardId) });
      await qc.cancelQueries({ queryKey: ["card", cardId] });
      
      const prev = qc.getQueryData<BoardDetail>(key(boardId));
      qc.setQueryData<BoardDetail>(key(boardId), (old) =>
        old
          ? { ...old, cards: old.cards.map((c) => (c.id === cardId ? { ...c, ...patch } : c)) }
          : old
      );

      const prevCard = qc.getQueryData<any>(["card", cardId]);
      if (prevCard) {
        qc.setQueryData(["card", cardId], { ...prevCard, ...patch });
      }

      return { prev, prevCard };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key(boardId), ctx.prev);
      if (ctx?.prevCard) qc.setQueryData(["card", _v.cardId], ctx.prevCard);
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: key(boardId) });
      qc.invalidateQueries({ queryKey: ["card", vars.cardId] });
      qc.invalidateQueries({ queryKey: ["cardActivities", vars.cardId] });
    },
  });
}

export function useDeleteCard(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cardId: string) => deleteCard(cardId, boardId),
    onMutate: async (cardId) => {
      await qc.cancelQueries({ queryKey: key(boardId) });
      const prev = qc.getQueryData<BoardDetail>(key(boardId));
      qc.setQueryData<BoardDetail>(key(boardId), (old) =>
        old ? { ...old, cards: old.cards.filter((c) => c.id !== cardId) } : old
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key(boardId), ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key(boardId) }),
  });
}

export function useMoveCard(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      cardId: string;
      toColumnId: string;
      toIndex: number;
      actorId?: string;
      fromColumnId?: string;
      siblingsExcludingMoved?: string[];
    }) => {
      return moveCard({
        cardId: args.cardId,
        boardId,
        fromColumnId: args.fromColumnId ?? args.toColumnId, // Fallback if missing
        toColumnId: args.toColumnId,
        siblingsExcludingMoved: args.siblingsExcludingMoved ?? [],
        toIndex: args.toIndex,
      });
    },
    onMutate: async (args) => {
      await qc.cancelQueries({ queryKey: key(boardId) });
      await qc.cancelQueries({ queryKey: ["card", args.cardId] });
      
      const prev = qc.getQueryData<BoardDetail>(key(boardId));
      const prevCard = qc.getQueryData<any>(["card", args.cardId]);

      if (prev) {
        const card = prev.cards.find((c) => c.id === args.cardId);
        if (card) {
          args.fromColumnId = card.column_id;
        }
        args.siblingsExcludingMoved = prev.cards
          .filter((c) => c.column_id === args.toColumnId && c.id !== args.cardId)
          .sort((a, b) => (a.position < b.position ? -1 : a.position > b.position ? 1 : 0))
          .map((c) => c.position);
      }

      if (!prev) return { prev, prevCard };

      const card = prev.cards.find((c) => c.id === args.cardId);
      if (!card) return { prev, prevCard };

      const siblings = prev.cards
        .filter((c) => c.column_id === args.toColumnId && c.id !== args.cardId)
        .sort((a, b) => (a.position < b.position ? -1 : a.position > b.position ? 1 : 0))
        .map((c) => c.position);

      let optimisticPos: string;
      try {
        optimisticPos = positionForIndex(siblings, args.toIndex);
      } catch {
        optimisticPos = positionAtEnd(siblings);
      }

      const next: BoardDetail = {
        ...prev,
        cards: prev.cards.map((c) =>
          c.id === args.cardId
            ? { ...c, column_id: args.toColumnId, position: optimisticPos }
            : c
        ),
      };
      qc.setQueryData(key(boardId), next);

      if (prevCard) {
        qc.setQueryData(["card", args.cardId], {
          ...prevCard,
          column_id: args.toColumnId,
          position: optimisticPos,
        });
      }

      return { prev, prevCard };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key(boardId), ctx.prev);
      if (ctx?.prevCard) qc.setQueryData(["card", _v.cardId], ctx.prevCard);
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: key(boardId) });
      qc.invalidateQueries({ queryKey: ["activity"] });
      qc.invalidateQueries({ queryKey: ["card", vars.cardId] });
    },
  });
}

// ----------------------------------------------------------------------------
// Columns
// ----------------------------------------------------------------------------
export function useAddColumn(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (title: string) => {
      const detail = qc.getQueryData<BoardDetail>(key(boardId));
      const siblingsPositions = (detail?.columns ?? []).map((c) => c.position);
      return addColumn({ boardId, title, siblingsPositions });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key(boardId) }),
  });
}

export function useUpdateColumn(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      colId,
      patch,
    }: {
      colId: string;
      patch: Partial<Pick<Column, "title" | "wip_limit">>;
    }) => updateColumn(colId, patch),
    onMutate: async ({ colId, patch }) => {
      await qc.cancelQueries({ queryKey: key(boardId) });
      const prev = qc.getQueryData<BoardDetail>(key(boardId));
      qc.setQueryData<BoardDetail>(key(boardId), (old) =>
        old
          ? { ...old, columns: old.columns.map((c) => (c.id === colId ? { ...c, ...patch } : c)) }
          : old
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key(boardId), ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key(boardId) }),
  });
}

export function useDeleteColumn(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (colId: string) => deleteColumn(colId),
    onSettled: () => qc.invalidateQueries({ queryKey: key(boardId) }),
  });
}

export function useMoveColumn(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { colId: string; toIndex: number }) => {
      const detail = qc.getQueryData<BoardDetail>(key(boardId));
      if (!detail) throw new Error("Board not loaded");
      const others = detail.columns
        .filter((c) => c.id !== args.colId)
        .sort((a, b) => (a.position < b.position ? -1 : a.position > b.position ? 1 : 0))
        .map((c) => c.position);
      const newPosition = positionForIndex(others, args.toIndex);
      return moveColumn({ colId: args.colId, newPosition });
    },
    onMutate: async (args) => {
      await qc.cancelQueries({ queryKey: key(boardId) });
      const prev = qc.getQueryData<BoardDetail>(key(boardId));
      if (!prev) return { prev };
      const others = prev.columns
        .filter((c) => c.id !== args.colId)
        .sort((a, b) => (a.position < b.position ? -1 : a.position > b.position ? 1 : 0))
        .map((c) => c.position);
      let pos: string;
      try {
        pos = positionForIndex(others, args.toIndex);
      } catch {
        pos = positionAtEnd(others);
      }
      qc.setQueryData<BoardDetail>(key(boardId), (old) =>
        old
          ? { ...old, columns: old.columns.map((c) => (c.id === args.colId ? { ...c, position: pos } : c)) }
          : old
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key(boardId), ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key(boardId) }),
  });
}

// ----------------------------------------------------------------------------
// Toggle helpers (labels, assignees)
// ----------------------------------------------------------------------------
export function useToggleCardLabel(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { cardId: string; labelId: string; on: boolean }) =>
      toggleCardLabel({ ...args, boardId }),
    onMutate: async (args) => {
      await qc.cancelQueries({ queryKey: key(boardId) });
      const prev = qc.getQueryData<BoardDetail>(key(boardId));
      qc.setQueryData<BoardDetail>(key(boardId), (old) =>
        old
          ? {
              ...old,
              cards: old.cards.map<Card>((c) =>
                c.id === args.cardId
                  ? {
                      ...c,
                      labels: args.on
                        ? [...c.labels, args.labelId]
                        : c.labels.filter((l) => l !== args.labelId),
                    }
                  : c
              ),
            }
          : old
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key(boardId), ctx.prev);
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: key(boardId) });
      qc.invalidateQueries({ queryKey: ["card", vars.cardId] });
      qc.invalidateQueries({ queryKey: ["cardActivities", vars.cardId] });
    },
  });
}

export function useToggleCardAssignee(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { cardId: string; userId: string; on: boolean }) =>
      toggleCardAssignee({ ...args, boardId }),
    onMutate: async (args) => {
      await qc.cancelQueries({ queryKey: key(boardId) });
      const prev = qc.getQueryData<BoardDetail>(key(boardId));
      qc.setQueryData<BoardDetail>(key(boardId), (old) =>
        old
          ? {
              ...old,
              cards: old.cards.map<Card>((c) =>
                c.id === args.cardId
                  ? {
                      ...c,
                      assignees: args.on
                        ? [...c.assignees, args.userId]
                        : c.assignees.filter((u) => u !== args.userId),
                    }
                  : c
              ),
            }
          : old
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key(boardId), ctx.prev);
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: key(boardId) });
      qc.invalidateQueries({ queryKey: ["card", vars.cardId] });
      qc.invalidateQueries({ queryKey: ["cardActivities", vars.cardId] });
    },
  });
}

export function useToggleCardWatcher(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { cardId: string; userId: string; on: boolean }) =>
      toggleCardWatcher(args),
    onMutate: async (args) => {
      await qc.cancelQueries({ queryKey: key(boardId) });
      const prev = qc.getQueryData<BoardDetail>(key(boardId));
      qc.setQueryData<BoardDetail>(key(boardId), (old) =>
        old
          ? {
              ...old,
              cards: old.cards.map<Card>((c) =>
                c.id === args.cardId
                  ? {
                      ...c,
                      watchers: args.on
                        ? [...c.watchers, args.userId]
                        : c.watchers.filter((u) => u !== args.userId),
                    }
                  : c
              ),
            }
          : old
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key(boardId), ctx.prev);
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: key(boardId) });
      qc.invalidateQueries({ queryKey: ["card", vars.cardId] });
    },
  });
}

// ----------------------------------------------------------------------------
// Board Labels
// ----------------------------------------------------------------------------
export function useAddLabel(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { name: string; color: string }) => addLabel({ boardId, ...args }),
    onSettled: () => qc.invalidateQueries({ queryKey: key(boardId) }),
  });
}

export function useUpdateLabel(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ labelId, patch }: { labelId: string; patch: { name?: string; color?: string } }) =>
      updateLabel(labelId, patch),
    onSettled: () => qc.invalidateQueries({ queryKey: key(boardId) }),
  });
}

export function useDeleteLabel(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (labelId: string) => deleteLabel(labelId),
    onSettled: () => qc.invalidateQueries({ queryKey: key(boardId) }),
  });
}

// ----------------------------------------------------------------------------
// Sprints
// ----------------------------------------------------------------------------
export function useActiveSprint(boardId: string) {
  return useQuery({
    queryKey: ["sprint", boardId],
    queryFn: () => getActiveSprint(boardId),
    enabled: !!boardId,
  });
}

export function useStartSprint(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { title: string; goal?: string }) =>
      startSprint({ boardId, ...args }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["sprint", boardId] });
    },
  });
}

export function useCompleteSprint(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sprintId: string) =>
      completeSprint({ sprintId, boardId }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["sprint", boardId] });
      qc.invalidateQueries({ queryKey: key(boardId) });
      qc.invalidateQueries({ queryKey: ["sprintArchives", boardId] });
    },
  });
}

export function useSprintArchives(boardId: string) {
  return useQuery({
    queryKey: ["sprintArchives", boardId],
    queryFn: () => listSprintArchives(boardId),
    enabled: !!boardId,
  });
}

export function useSprintArchiveDetail(sprintId: string | null) {
  return useQuery({
    queryKey: ["sprintArchiveDetail", sprintId],
    queryFn: () => getSprintArchiveDetail(sprintId!),
    enabled: !!sprintId,
  });
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => getLeaderboard(),
  });
}

