"use client";

import * as Dialog from "@kibamail/owly/dialog";
import { Button } from "@kibamail/owly/button";
import { Text } from "@kibamail/owly/text";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { CancelIcon } from "./icons/cancel-icon";
import { Heading } from "@kibamail/owly/heading";
import { Badge } from "@kibamail/owly/badge";
import { SlashesDivider } from "./slashes-divider";
import { DnsRecordsTable, type DnsRecord } from "./dns-records-table";
import { useState } from "react";

interface ConfigureSendingDomainProps {
  open: boolean;
  domainName: string;
  onOpenChange: (open: boolean) => void;
}

// Mock DNS records for the static version
function getMockDnsRecords(domainName: string) {
  const returnPathRecord: DnsRecord = {
    type: "CNAME",
    hostname: `bounce.${domainName}`,
    value: "feedback-smtp.kibamail.com",
    verified: false,
  };

  const dkimRecord: DnsRecord = {
    type: "TXT",
    hostname: `kiba._domainkey.${domainName}`,
    value:
      "k=rsa;p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC3QwkrC5LHYqNqj7YCJUFq...",
    verified: false,
  };

  const trackingRecord: DnsRecord = {
    type: "CNAME",
    hostname: `track.${domainName}`,
    value: "track.kibamail.com",
    verified: false,
  };

  return { returnPathRecord, dkimRecord, trackingRecord };
}

export function ConfigureSendingDomain({
  open,
  onOpenChange,
  domainName,
}: ConfigureSendingDomainProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [lastVerified, setLastVerified] = useState<Date | null>(null);

  const { returnPathRecord, dkimRecord, trackingRecord } = getMockDnsRecords(
    domainName || "send.yourdomain.com"
  );

  function onVerifyRecords() {
    setIsVerifying(true);
    // Simulate verification delay
    setTimeout(() => {
      setIsVerifying(false);
      setLastVerified(new Date());
    }, 2000);
  }

  function getRelativeTime(date: Date | null) {
    if (!date) return "Never";
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="!max-w-none !max-h-none !top-0 !left-0 !transform-none h-screen !rounded-none w-full overflow-auto">
        <VisuallyHidden>
          <Dialog.Header>
            <Dialog.Title>Configure sending domain</Dialog.Title>
            <Dialog.Description>
              Configure DNS records for your sending domain
            </Dialog.Description>
          </Dialog.Header>
        </VisuallyHidden>

        <div className="w-full h-16 flex items-center justify-end px-6 lg:px-12 shrink-0">
          <Dialog.Close asChild>
            <Button variant="secondary">
              <CancelIcon />
            </Button>
          </Dialog.Close>
        </div>

        <div className="w-full max-w-4xl mt-8 mx-auto px-4">
          <div className="mb-2">
            <img src="/logos/logo-icon.png" width={32} height={32} alt="logo" />
          </div>
          <Heading>Configure your domain name</Heading>
          <Text className="text-kb-content-secondary">
            Head to your DNS provider and add DKIM and Return-Path DNS record to
            verify your domain and ensure effective delivery.
          </Text>

          <div className="mt-6 flex items-center gap-3 pb-6 border-b border-kb-border-tertiary">
            <Button
              loading={isVerifying}
              onClick={onVerifyRecords}
              disabled={false}
            >
              Verify records
            </Button>

            <Button variant="tertiary" disabled={false}>
              Send instructions to a developer
            </Button>
          </div>

          <div className="pt-6 pb-1 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Text className="text-kb-content-secondary">
                {domainName || "send.yourdomain.com"}
              </Text>

              <Badge size="sm" variant="warning">
                Pending
              </Badge>
            </div>

            <Text className="text-kb-content-secondary">
              Last verified {getRelativeTime(lastVerified)}
            </Text>
          </div>

          <SlashesDivider count={110} />

          <div className="flex flex-col gap-12 pb-16">
            <div className="flex flex-col w-full gap-6">
              <div className="flex items-center gap-4">
                <Heading
                  size="xs"
                  className="text-kb-content-secondary !font-normal !text-sm"
                >
                  Return path records
                </Heading>

                <Text className="text-kb-content-secondary">
                  Configure this so we can automatically handle email bounces
                  and errors for you.
                </Text>
              </div>

              <DnsRecordsTable
                records={[returnPathRecord]}
                title="Return Path Configuration"
              />
            </div>

            <div className="flex flex-col w-full gap-6">
              <div className="flex items-center gap-4">
                <Heading
                  size="xs"
                  className="text-kb-content-secondary !font-normal !text-sm"
                >
                  DKIM records
                </Heading>

                <Text className="text-kb-content-secondary">
                  Securely sign all your emails to comply with email provider
                  requirements.
                </Text>
              </div>

              <DnsRecordsTable
                records={[dkimRecord]}
                title="DKIM Configuration"
              />
            </div>

            <div className="flex flex-col w-full gap-6">
              <div className="flex items-center gap-4">
                <Heading
                  size="xs"
                  className="text-kb-content-secondary !font-normal !text-sm"
                >
                  Tracking domain records
                </Heading>

                <Text className="text-kb-content-secondary">
                  Send emails with your domain branded links to highly improve
                  your email deliverability
                </Text>
              </div>

              <DnsRecordsTable
                records={[trackingRecord]}
                title="Tracking Configuration"
              />
            </div>
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
