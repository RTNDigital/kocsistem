"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getBoardDetail } from "@/lib/queries";
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
} from "@/lib/mutations";
import type { BoardDetail, Card, Column } from "@/types/domain";
import type { CardPriority } from "@/types/database";
import { positionAtEnd, positionForIndex } from "@/lib/ordering";

export function useBoard(boardId: string) {
  return useQuery({
    queryKey: ["board", boardId],
    queryFn: () => getBoardDetail(boardId),
    enabled: !!boardId,
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
      patch: { title?: string; description?: string; priority?: CardPriority | null; due_at?: string | null };
    }) => updateCard(cardId, patch),
    onMutate: async ({ cardId, patch }) => {
      await qc.cancelQueries({ queryKey: key(boardId) });
      const prev = qc.getQueryData<BoardDetail>(key(boardId));
      qc.setQueryData<BoardDetail>(key(boardId), (old) =>
        old
          ? { ...old, cards: old.cards.map((c) => (c.id === cardId ? { ...c, ...patch } : c)) }
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

export function useDeleteCard(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cardId: string) => deleteCard(cardId),
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
    }) => {
      const detail = qc.getQueryData<BoardDetail>(key(boardId));
      if (!detail) throw new Error("Board not loaded");
      const card = detail.cards.find((c) => c.id === args.cardId);
      if (!card) throw new Error("Card not found");

      const siblingsExcludingMoved = detail.cards
        .filter((c) => c.column_id === args.toColumnId && c.id !== args.cardId)
        .sort((a, b) => a.position.localeCompare(b.position))
        .map((c) => c.position);

      return moveCard({
        cardId: args.cardId,
        boardId,
        fromColumnId: card.column_id,
        toColumnId: args.toColumnId,
        siblingsExcludingMoved,
        toIndex: args.toIndex,
      });
    },
    onMutate: async (args) => {
      await qc.cancelQueries({ queryKey: key(boardId) });
      const prev = qc.getQueryData<BoardDetail>(key(boardId));
      if (!prev) return { prev };

      const card = prev.cards.find((c) => c.id === args.cardId);
      if (!card) return { prev };

      const siblings = prev.cards
        .filter((c) => c.column_id === args.toColumnId && c.id !== args.cardId)
        .sort((a, b) => a.position.localeCompare(b.position))
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
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key(boardId), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key(boardId) });
      qc.invalidateQueries({ queryKey: ["activity"] });
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
        .sort((a, b) => a.position.localeCompare(b.position))
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
        .sort((a, b) => a.position.localeCompare(b.position))
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
      toggleCardLabel(args),
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
    },
  });
}

export function useToggleCardAssignee(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { cardId: string; userId: string; on: boolean }) =>
      toggleCardAssignee(args),
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
    },
  });
}
