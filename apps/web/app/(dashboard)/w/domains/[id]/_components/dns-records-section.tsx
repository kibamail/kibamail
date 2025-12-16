"use client";

import { Badge } from "@kibamail/owly/badge";
import { Button } from "@kibamail/owly/button";
import { useToast } from "@kibamail/owly/toast";
import type { SendingDomain } from "@prisma/client";
import { Copy } from "iconoir-react";

interface DnsRecordRowProps {
  type: string;
  hostname: string;
  value: string;
  verified: boolean;
}

function DnsRecordRow({ type, hostname, value, verified }: DnsRecordRowProps) {
  const { success: toast } = useToast();

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied to clipboard");
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  }

  return (
    <tr className="border-b border-kb-border-tertiary last:border-b-0">
      <td className="py-4 pr-4 align-top">
        <span className="text-xs font-medium text-kb-content-tertiary uppercase">
          {type}
        </span>
      </td>
      <td className="py-4 pr-4 align-top">
        <Button
          variant="tertiary"
          size="sm"
          className="flex items-start gap-2 text-left p-1 -m-1"
          onClick={() => copyToClipboard(hostname)}
        >
          <Copy className="w-4 h-4 text-kb-content-tertiary flex-shrink-0 mt-0.5" />
          <span className="font-mono text-sm text-kb-content-tertiary break-all">
            {hostname}
          </span>
        </Button>
      </td>
      <td className="py-4 pr-4 align-top max-w-md">
        <Button
          variant="tertiary"
          size="sm"
          className="flex items-start gap-2 text-left p-1 -m-1"
          onClick={() => copyToClipboard(value)}
        >
          <Copy className="w-4 h-4 text-kb-content-tertiary flex-shrink-0 mt-0.5" />
          <span className="font-mono text-sm text-kb-content-tertiary break-all">
            {value}
          </span>
        </Button>
      </td>
      <td className="py-4 text-right align-top">
        <Badge variant={verified ? "success" : "warning"} size="sm">
          {verified ? "Verified" : "Pending"}
        </Badge>
      </td>
    </tr>
  );
}

interface DnsRecordsSectionProps {
  domain: SendingDomain;
}

function cleanupPublicKey(publicKey: string): string {
  const lines = publicKey.split("\n");
  lines.shift();
  lines.pop();
  lines.pop();
  return lines.join("");
}

export function DnsRecordsSection({ domain }: DnsRecordsSectionProps) {
  const dkimValue = `k=rsa;p=${
    domain.dkimPublicKey.includes("-----BEGIN")
      ? cleanupPublicKey(domain.dkimPublicKey)
      : domain.dkimPublicKey
  }`;

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-sm font-medium text-kb-content-secondary">
            Return Path Records
          </h3>
          <span className="text-sm text-kb-content-tertiary">
            Configure this so we can automatically handle email bounces and
            errors for you.
          </span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-kb-border-tertiary">
              <th className="py-3 text-left text-xs font-medium text-kb-content-tertiary uppercase w-24">
                Type
              </th>
              <th className="py-3 text-left text-xs font-medium text-kb-content-tertiary uppercase w-64">
                Host Name
              </th>
              <th className="py-3 text-left text-xs font-medium text-kb-content-tertiary uppercase">
                Value
              </th>
              <th className="py-3 text-right text-xs font-medium text-kb-content-tertiary uppercase w-24">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            <DnsRecordRow
              type="CNAME"
              hostname={`${domain.returnPathSubDomain}.${domain.name}`}
              value={domain.returnPathDomainCnameValue}
              verified={domain.returnPathDomainVerifiedAt !== null}
            />
          </tbody>
        </table>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-sm font-medium text-kb-content-secondary">
            DKIM Records
          </h3>
          <span className="text-sm text-kb-content-tertiary">
            Securely sign all your emails to comply with email provider
            requirements.
          </span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-kb-border-tertiary">
              <th className="py-3 text-left text-xs font-medium text-kb-content-tertiary uppercase w-24">
                Type
              </th>
              <th className="py-3 text-left text-xs font-medium text-kb-content-tertiary uppercase w-64">
                Host Name
              </th>
              <th className="py-3 text-left text-xs font-medium text-kb-content-tertiary uppercase">
                Value
              </th>
              <th className="py-3 text-right text-xs font-medium text-kb-content-tertiary uppercase w-24">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            <DnsRecordRow
              type="TXT"
              hostname={`${domain.dkimSubDomain}.${domain.name}`}
              value={dkimValue}
              verified={domain.dkimVerifiedAt !== null}
            />
          </tbody>
        </table>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-sm font-medium text-kb-content-secondary">
            Tracking Domain Records
          </h3>
          <span className="text-sm text-kb-content-tertiary">
            Send emails with your domain branded links to highly improve your
            email deliverability.
          </span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-kb-border-tertiary">
              <th className="py-3 text-left text-xs font-medium text-kb-content-tertiary uppercase w-24">
                Type
              </th>
              <th className="py-3 text-left text-xs font-medium text-kb-content-tertiary uppercase w-64">
                Host Name
              </th>
              <th className="py-3 text-left text-xs font-medium text-kb-content-tertiary uppercase">
                Value
              </th>
              <th className="py-3 text-right text-xs font-medium text-kb-content-tertiary uppercase w-24">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            <DnsRecordRow
              type="CNAME"
              hostname={`${domain.trackingSubDomain}.${domain.name}`}
              value={domain.trackingDomainCnameValue}
              verified={domain.trackingDomainVerifiedAt !== null}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}
