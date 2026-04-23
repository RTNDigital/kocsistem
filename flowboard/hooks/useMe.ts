"use client";

import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/lib/queries";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => getMe(),
    staleTime: 5 * 60 * 1000,
  });
}
