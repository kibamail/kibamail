"use client";

import { useQuery } from "@tanstack/react-query";
import { internalApi } from "@/lib/api/client";

export function useSegments() {
  return useQuery({
    queryKey: ["segments"],
    queryFn: () => internalApi.segments().list(),
  });
}
