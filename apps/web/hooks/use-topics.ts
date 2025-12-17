"use client";

import { useQuery } from "@tanstack/react-query";
import { internalApi } from "@/lib/api/client";

export function useTopics() {
  return useQuery({
    queryKey: ["topics"],
    queryFn: () => internalApi.topics().list(),
  });
}
