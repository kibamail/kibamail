"use client";

import { Badge, Heading, Text } from "@kibamail/owly";
import { useQuery } from "@tanstack/react-query";

interface FormStats {
  views: number;
  submissions: number;
  conversionRate: number;
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

interface AnalyticsTabProps {
  formId: string;
  isActive: boolean;
}

export function AnalyticsTab({ formId, isActive }: AnalyticsTabProps) {
  const { data: stats, isLoading } = useQuery<FormStats>({
    queryKey: ["form-analytics", formId],
    queryFn: async () => {
      const response = await fetch(
        `/api/internal/v1/forms/${formId}/stats`,
      );
      if (!response.ok) throw new Error("Failed to fetch stats");
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

  return (
    <div className="h-full w-full bg-kb-bg-primary flex flex-col">
      <div className="max-w-6xl mx-auto mt-12 w-full px-6">
        <div className="w-full rounded-xl border border-kb-border-tertiary grid grid-cols-3">
          <div className="w-full p-5 border-r border-kb-border-tertiary rounded-tl-xl rounded-bl-xl">
            <Text variant="tertiary">Views</Text>

            <div className="mt-2 flex items-center justify-between">
              <Heading>{formatNumber(stats.views)}</Heading>
              <Badge size="sm" variant="info" className="rounded-full!">
                Unique
              </Badge>
            </div>
          </div>

          <div className="w-full p-5 border-r border-kb-border-tertiary">
            <Text variant="tertiary">Submissions</Text>

            <div className="mt-2 flex items-center justify-between">
              <Heading>{formatNumber(stats.submissions)}</Heading>
            </div>
          </div>

          <div className="w-full p-5 rounded-tr-xl rounded-br-xl">
            <Text variant="tertiary">Conversion</Text>

            <div className="mt-2 flex items-center justify-between">
              <Text>Conversion rate</Text>
              <Badge
                size="sm"
                variant={stats.conversionRate > 0.05 ? "success" : "warning"}
                className="rounded-full!"
              >
                {formatPercent(stats.conversionRate)}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
