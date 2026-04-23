"use client";

import { useQuery } from "@tanstack/react-query";
import { listAllCards } from "@/lib/queries";
import type { ListCard } from "@/types/domain";

export function useListCards() {
  return useQuery<ListCard[]>({
    queryKey: ["list-cards"],
    queryFn: () => listAllCards(),
    staleTime: 30 * 1000,
  });
}
