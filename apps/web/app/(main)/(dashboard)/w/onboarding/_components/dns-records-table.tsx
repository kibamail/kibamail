"use client";

import { Badge } from "@kibamail/owly/badge";
import { Text } from "@kibamail/owly/text";
import { Button } from "@kibamail/owly/button";
import { CopyIcon } from "./icons/copy-icon";

export interface DnsRecord {
  type: string;
  hostname: string;
  value: string;
  verified: boolean;
}

interface DnsRecordsTableProps {
  records: DnsRecord[];
  title: string;
}

export function DnsRecordsTable({ records }: DnsRecordsTableProps) {
  async function copyToClipboard(value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch (_error) {
      // Ignore clipboard errors in static version
    }
  }

  return (
    <div className="w-full">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-kb-border-tertiary">
            <th className="text-left py-2 pr-4 w-24">
              <Text
                size="sm"
                className="font-medium uppercase text-kb-content-secondary"
              >
                Type
              </Text>
            </th>
            <th className="text-left py-2 pr-4 w-64">
              <Text
                size="sm"
                className="font-medium uppercase text-kb-content-secondary"
              >
                Host name
              </Text>
            </th>
            <th className="text-left py-2 pr-4">
              <Text
                size="sm"
                className="font-medium uppercase text-kb-content-secondary"
              >
                Value
              </Text>
            </th>
            <th className="text-right py-2 w-24">
              <Text
                size="sm"
                className="font-medium uppercase text-kb-content-secondary"
              >
                Status
              </Text>
            </th>
          </tr>
        </thead>
        <tbody>
          {records.map((record, index) => (
            <tr
              key={index}
              className={
                index === records.length - 1
                  ? "border-b border-kb-border-tertiary"
                  : ""
              }
            >
              <td className="py-3 pr-4 align-top">
                <Text
                  size="sm"
                  className="font-medium uppercase text-kb-content-secondary"
                >
                  {record.type}
                </Text>
              </td>
              <td className="py-3 pr-4 align-top">
                <Button
                  variant="tertiary"
                  className="flex items-start gap-2 cursor-pointer hover:bg-muted p-1 rounded text-left h-auto"
                  onClick={() => copyToClipboard(record.hostname)}
                >
                  <CopyIcon className="w-4 h-4 text-kb-content-secondary flex-shrink-0 mt-0.5" />
                  <Text className="font-mono text-sm break-all text-kb-content-secondary">
                    {record.hostname}
                  </Text>
                </Button>
              </td>
              <td className="py-3 pr-4 align-top">
                <Button
                  variant="tertiary"
                  className="flex items-start gap-2 cursor-pointer hover:bg-muted p-1 rounded text-left h-auto max-w-full"
                  onClick={() => copyToClipboard(record.value)}
                >
                  <CopyIcon className="w-4 h-4 text-kb-content-secondary flex-shrink-0 mt-0.5" />
                  <Text className="font-mono text-sm break-all text-kb-content-secondary">
                    {record.value}
                  </Text>
                </Button>
              </td>
              <td className="py-3 align-top text-right">
                <Badge
                  variant={record.verified ? "success" : "warning"}
                  size="sm"
                >
                  {record.verified ? "Verified" : "Pending"}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
