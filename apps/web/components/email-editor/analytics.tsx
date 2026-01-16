"use client";

import { Badge, Heading, Text } from "@kibamail/owly";
import { useQuery } from "@tanstack/react-query";
import type { BroadcastStatsResponse } from "@/app/(main)/api/internal/v1/broadcasts/[broadcastId]/stats/route";

interface AnalyticsProps {
  broadcastId: string;
  isActive: boolean;
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

export function Analytics({ broadcastId, isActive }: AnalyticsProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["broadcast-stats", broadcastId],
    queryFn: async (): Promise<BroadcastStatsResponse> => {
      const response = await fetch(
        `/api/internal/v1/broadcasts/${broadcastId}/stats`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }
      return response.json();
    },
    enabled: isActive,
    refetchOnWindowFocus: false,
  });

  if (isLoading || !stats) {
    return (
      <div className="h-full w-full bg-kb-bg-primary flex items-center justify-center">
        <Text variant="tertiary">Loading analytics...</Text>
      </div>
    );
  }

  const { recipients, engagement, deliverability } = stats;

  return (
    <div className="h-full w-full bg-kb-bg-primary flex flex-col">
      <div className="max-w-6xl mx-auto mt-12 w-full px-6">
        <div className="w-full rounded-xl border border-kb-border-tertiary grid grid-cols-3">
          {/* Delivery Card */}
          <div className="w-full p-5 border-r border-kb-border-tertiary rounded-tl-xl rounded-bl-xl">
            <Text variant="tertiary">Delivery</Text>

            <div className="mt-2 flex items-center justify-between">
              <Heading>{formatNumber(recipients.delivered)}</Heading>
              <Badge variant="info" className="rounded-full!">
                {formatPercent(deliverability.deliveryRate)}
              </Badge>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2">
                <Text variant="tertiary" className="shrink-0">
                  Bounced
                </Text>
                <div className="w-full grow h-px bg-kb-border-tertiary" />
                <Text variant="tertiary">{formatNumber(recipients.bounced)}</Text>
              </div>
            </div>
          </div>

          {/* Engagement Card */}
          <div className="w-full p-5 border-r border-kb-border-tertiary">
            <Text variant="tertiary">Engagement</Text>

            <div className="mt-2 flex items-center justify-between">
              <Text>Open rate</Text>
              <Badge variant="success" className="rounded-full!">
                {formatPercent(engagement.openRate)}
              </Badge>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2">
                <Text variant="tertiary" className="shrink-0">
                  Click rate
                </Text>
                <div className="w-full grow h-px bg-kb-border-tertiary" />
                <Text variant="tertiary">{formatPercent(engagement.clickRate)}</Text>
              </div>
            </div>
          </div>

          {/* Health Card */}
          <div className="w-full p-5 rounded-tr-xl rounded-br-xl">
            <Text variant="tertiary">Health</Text>

            <div className="mt-2 flex items-center justify-between">
              <Text>Bounce rate</Text>
              <Badge variant="warning" className="rounded-full!">
                {formatPercent(deliverability.bounceRate)}
              </Badge>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2">
                <Text variant="tertiary" className="shrink-0">
                  Complained
                </Text>
                <div className="w-full grow h-px bg-kb-border-tertiary" />
                <Text variant="tertiary">{formatPercent(deliverability.complaintRate)}</Text>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
