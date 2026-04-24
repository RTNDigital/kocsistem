"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getCardDetail, getCardActivities } from "@/lib/queries";
import {
  addChecklistItem,
  addComment,
  deleteChecklistItem,
  toggleChecklistItem,
} from "@/lib/mutations";
import type { CardDetail } from "@/types/domain";

export function useCardDetail(cardId: string | null) {
  return useQuery({
    queryKey: ["card", cardId],
    queryFn: () => (cardId ? getCardDetail(cardId) : null),
    enabled: !!cardId,
  });
}

export function useCardActivities(cardId: string) {
  return useQuery({
    queryKey: ["cardActivities", cardId],
    queryFn: () => getCardActivities(cardId),
    enabled: !!cardId,
  });
}

export function useAddChecklist(cardId: string, boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) => {
      const cur = qc.getQueryData<CardDetail>(["card", cardId]);
      const siblingsPositions = (cur?.checklist ?? []).map((i) => i.position);
      return addChecklistItem({ cardId, boardId, text, siblingsPositions });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["card", cardId] });
      qc.invalidateQueries({ queryKey: ["board", boardId] });
      qc.invalidateQueries({ queryKey: ["cardActivities", cardId] });
    },
  });
}

export function useToggleChecklist(cardId: string, boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, done }: { itemId: string; done: boolean }) =>
      toggleChecklistItem(itemId, done, { boardId, cardId }),
    onMutate: async ({ itemId, done }) => {
      await qc.cancelQueries({ queryKey: ["card", cardId] });
      const prev = qc.getQueryData<CardDetail>(["card", cardId]);
      qc.setQueryData<CardDetail>(["card", cardId], (old) =>
        old
          ? { ...old, checklist: old.checklist.map((i) => (i.id === itemId ? { ...i, done } : i)) }
          : old
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["card", cardId], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["card", cardId] });
      qc.invalidateQueries({ queryKey: ["board", boardId] });
      qc.invalidateQueries({ queryKey: ["cardActivities", cardId] });
    },
  });
}

export function useDeleteChecklist(cardId: string, boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => deleteChecklistItem(itemId, { boardId, cardId }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["card", cardId] });
      qc.invalidateQueries({ queryKey: ["board", boardId] });
      qc.invalidateQueries({ queryKey: ["cardActivities", cardId] });
    },
  });
}

export function useAddComment(cardId: string, boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ text, file }: { authorId?: string; text: string; file?: File }) => {
      let attachment: {
        url: string;
        key: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
      } | undefined;

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Upload failed");
        }
        attachment = await res.json();
      }

      return addComment({ cardId, boardId, text, attachment });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["card", cardId] });
      qc.invalidateQueries({ queryKey: ["board", boardId] });
      qc.invalidateQueries({ queryKey: ["activity"] });
      qc.invalidateQueries({ queryKey: ["cardActivities", cardId] });
    },
  });
}
