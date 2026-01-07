"use client";

import { Badge } from "@kibamail/owly/badge";
import { Button } from "@kibamail/owly/button";
import { useToast } from "@kibamail/owly/toast";
import * as Tooltip from "@kibamail/owly/tooltip";
import type { SendingDomain } from "@prisma/client";
import { Copy } from "iconoir-react";
import { buildDmarcPolicy } from "@/lib/sending-domains/dmarc";

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
      <td className="py-4 pr-4 align-top max-w-[200px]">
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <Button
                variant="tertiary"
                size="sm"
                className="flex items-start gap-2 text-left p-1 -m-1 max-w-full"
                onClick={() => copyToClipboard(hostname)}
              >
                <Copy className="w-4 h-4 text-kb-content-tertiary flex-shrink-0 mt-0.5" />
                <span className="font-mono text-sm text-kb-content-tertiary truncate">
                  {hostname}
                </span>
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content side="top" className="max-w-sm">
              <p className="font-mono text-xs break-all">{hostname}</p>
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      </td>
      <td className="py-4 pr-4 align-top max-w-[300px]">
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <Button
                variant="tertiary"
                size="sm"
                className="flex items-start gap-2 text-left p-1 -m-1 max-w-full"
                onClick={() => copyToClipboard(value)}
              >
                <Copy className="w-4 h-4 text-kb-content-tertiary flex-shrink-0 mt-0.5" />
                <span className="font-mono text-sm text-kb-content-tertiary truncate">
                  {value}
                </span>
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content side="top" className="max-w-md">
              <p className="font-mono text-xs break-all">{value}</p>
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      </td>
      <td className="py-4 text-right align-top">
        <Badge variant={verified ? "success" : "warning"} size="sm">
          {verified ? "Verified" : "Pending"}
        </Badge>
      </td>
    </tr>
  );
}

interface MxRecordRowProps {
  hostname: string;
  priority: number;
  value: string;
  verified: boolean;
}

function MxRecordRow({ hostname, priority, value, verified }: MxRecordRowProps) {
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
          MX
        </span>
      </td>
      <td className="py-4 pr-4 align-top max-w-[200px]">
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <Button
                variant="tertiary"
                size="sm"
                className="flex items-start gap-2 text-left p-1 -m-1 max-w-full"
                onClick={() => copyToClipboard(hostname)}
              >
                <Copy className="w-4 h-4 text-kb-content-tertiary flex-shrink-0 mt-0.5" />
                <span className="font-mono text-sm text-kb-content-tertiary truncate">
                  {hostname}
                </span>
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content side="top" className="max-w-sm">
              <p className="font-mono text-xs break-all">{hostname}</p>
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      </td>
      <td className="py-4 pr-4 align-top">
        <span className="font-mono text-sm text-kb-content-tertiary">
          {priority}
        </span>
      </td>
      <td className="py-4 pr-4 align-top max-w-[300px]">
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <Button
                variant="tertiary"
                size="sm"
                className="flex items-start gap-2 text-left p-1 -m-1 max-w-full"
                onClick={() => copyToClipboard(value)}
              >
                <Copy className="w-4 h-4 text-kb-content-tertiary flex-shrink-0 mt-0.5" />
                <span className="font-mono text-sm text-kb-content-tertiary truncate">
                  {value}
                </span>
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content side="top" className="max-w-md">
              <p className="font-mono text-xs break-all">{value}</p>
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
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

/**
 * Get the hostname for DNS record display (without the root domain).
 * DNS providers expect just the subdomain portion since the root domain is implied.
 *
 * Example:
 * - domain: "newsletter.app.constructor.com", subdomain: "kibamail._domainkey"
 * - Result: "kibamail._domainkey.newsletter.app" (strips "constructor.com")
 */
function getDnsHostname(subdomain: string, domainName: string): string {
  const parts = domainName.split(".");
  if (parts.length <= 2) {
    // No subdomain in domain name, just return the subdomain prefix
    return subdomain;
  }
  // Get all parts except the last two (the root domain)
  const subdomainPart = parts.slice(0, -2).join(".");
  return `${subdomain}.${subdomainPart}`;
}

/**
 * Get the MX hostname for DNS record display.
 * For MX records, the hostname is the subdomain portion of the domain.
 *
 * Example:
 * - domain: "kakari.kibamail.xyz" -> hostname: "kakari"
 * - domain: "kibamail.xyz" -> hostname: "@"
 */
function getMxHostname(domainName: string): string {
  const parts = domainName.split(".");
  if (parts.length <= 2) {
    // Root domain, use @
    return "@";
  }
  // Get all parts except the last two (the root domain)
  return parts.slice(0, -2).join(".");
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
    <div className="space-y-8 mt-16">
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
              hostname={getDnsHostname(domain.returnPathSubDomain, domain.name)}
              value={domain.returnPathDomainCnameValue}
              verified={Boolean(domain.returnPathDomainVerifiedAt)}
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
              hostname={getDnsHostname(domain.dkimSubDomain, domain.name)}
              value={dkimValue}
              verified={Boolean(domain.dkimVerifiedAt)}
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
              hostname={getDnsHostname(domain.trackingSubDomain, domain.name)}
              value={domain.trackingDomainCnameValue}
              verified={Boolean(domain.trackingDomainVerifiedAt)}
            />
          </tbody>
        </table>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-sm font-medium text-kb-content-secondary">
            DMARC Record
          </h3>
          <span className="text-sm text-kb-content-tertiary">
            Protect your domain from email spoofing and improve deliverability.
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
              hostname={getDnsHostname("_dmarc", domain.name)}
              value={buildDmarcPolicy(domain.dmarcReportingCode)}
              verified={Boolean(domain.dmarcVerifiedAt)}
            />
          </tbody>
        </table>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-sm font-medium text-kb-content-secondary">
            MX Record (Inbox)
          </h3>
          <span className="text-sm text-kb-content-tertiary">
            Receive email replies directly to your domain for two-way
            conversations.
          </span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-kb-border-tertiary">
              <th className="py-3 text-left text-xs font-medium text-kb-content-tertiary uppercase w-24">
                Type
              </th>
              <th className="py-3 text-left text-xs font-medium text-kb-content-tertiary uppercase w-48">
                Host Name
              </th>
              <th className="py-3 text-left text-xs font-medium text-kb-content-tertiary uppercase w-24">
                Priority
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
            <MxRecordRow
              hostname={getMxHostname(domain.name)}
              priority={10}
              value="mail.kbmta.net"
              verified={Boolean(domain.inboxMxVerifiedAt)}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}
