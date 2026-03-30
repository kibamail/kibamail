"use client";

import * as Alert from "@kibamail/owly/alert";
import { Badge, Heading, Text } from "@kibamail/owly";
import { Button } from "@kibamail/owly/button";
import { Checkbox } from "@kibamail/owly/checkbox";
import * as TextField from "@kibamail/owly/text-field";
import { useToast } from "@kibamail/owly/toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Eye,
  GraphUp,
  InfoCircle,
  WarningTriangle,
  Xmark,
} from "iconoir-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

import { internalApi } from "@/lib/api/client";
import {
  SectionHeader,
  SectionDivider,
  SectionSaveButton,
} from "@/components/email-editor/details-sections/shared";
import { ReplyToSelect } from "@/components/reply-to-select";
import type {
  CreatedDomain,
  TransformedSenderIdentity,
} from "@/components/sender-select";
import { SenderSelect } from "@/components/sender-select";

type EditorTab = "preview" | "analytics" | "details";

const VALID_TABS: EditorTab[] = ["preview", "analytics", "details"];

interface MarketingEmailEditorClientProps {
  emailId: string;
  emailName: string;
  emailSubject: string;
  emailPreviewText: string;
  initialTrackClicks: boolean;
  initialTrackOpens: boolean;
  initialSenderIdentityId?: string;
  initialReplyToIdentityId?: string;
  usedByForms: { id: string; name: string }[];
  senderIdentities: TransformedSenderIdentity[];
  domains: { id: string; name: string }[];
}

export function MarketingEmailEditorClient({
  emailId,
  emailName,
  emailSubject,
  emailPreviewText,
  initialTrackClicks,
  initialTrackOpens,
  initialSenderIdentityId,
  initialReplyToIdentityId,
  usedByForms,
  senderIdentities: initialSenderIdentities,
  domains: initialDomains,
}: MarketingEmailEditorClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab");
  const activeTab: EditorTab = VALID_TABS.includes(tabParam as EditorTab)
    ? (tabParam as EditorTab)
    : "preview";

  function setActiveTab(tab: EditorTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    if (!tabParam || !VALID_TABS.includes(tabParam as EditorTab)) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "preview");
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [tabParam, searchParams, router]);

  return (
    <div className="w-full h-screen flex box-border flex-col px-2 pb-2 bg-kb-bg-layout">
      <div className="h-[60px] relative w-full flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="tertiary" asChild>
            <Link href="/w/marketing-emails">
              <Xmark className="w-6! h-6!" />
            </Link>
          </Button>

          <div>
            <h1 className="text-lg font-semibold text-kb-content-primary">
              {emailName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 absolute left-[50%] translate-x-[-50%]">
          <Button
            className="rounded-full!"
            variant={activeTab === "preview" ? "secondary" : "tertiary"}
            onClick={() => setActiveTab("preview")}
          >
            <Eye className="w-4 h-4" />
            Preview
          </Button>
          <div className="w-12 h-px bg-kb-border-tertiary" />
          <Button
            className="rounded-full!"
            variant={activeTab === "analytics" ? "secondary" : "tertiary"}
            onClick={() => setActiveTab("analytics")}
          >
            <GraphUp className="w-4 h-4" />
            Analytics
          </Button>
          <div className="w-12 h-px bg-kb-border-tertiary" />
          <Button
            className="rounded-full!"
            variant={activeTab === "details" ? "secondary" : "tertiary"}
            onClick={() => setActiveTab("details")}
          >
            <InfoCircle className="w-4 h-4" />
            Details
          </Button>
        </div>

        <div />
      </div>

      <div className="grow rounded-lg overflow-hidden relative border border-kb-border-tertiary">
        <div
          className={`absolute inset-0 ${
            activeTab === "preview"
              ? "visible"
              : "invisible pointer-events-none"
          }`}
        >
          <PreviewTab emailId={emailId} isActive={activeTab === "preview"} />
        </div>
        <div
          className={`absolute inset-0 ${
            activeTab === "analytics"
              ? "visible"
              : "invisible pointer-events-none"
          }`}
        >
          <AnalyticsTab emailId={emailId} usedByForms={usedByForms} isActive={activeTab === "analytics"} />
        </div>
        <div
          className={`absolute inset-0 ${
            activeTab === "details"
              ? "visible"
              : "invisible pointer-events-none"
          }`}
        >
          <DetailsTab
            emailId={emailId}
            initialSubject={emailSubject}
            initialPreviewText={emailPreviewText}
            initialTrackClicks={initialTrackClicks}
            initialTrackOpens={initialTrackOpens}
            initialSenderIdentityId={initialSenderIdentityId}
            initialReplyToIdentityId={initialReplyToIdentityId}
            usedByForms={usedByForms}
            senderIdentities={initialSenderIdentities}
            domains={initialDomains}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Preview Tab ─── */

function PreviewTab({
  emailId,
  isActive,
}: {
  emailId: string;
  isActive: boolean;
}) {
  const {
    data: preview,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["email-preview", emailId],
    queryFn: () => internalApi.emails().preview(emailId),
    enabled: isActive,
  });

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-kb-content-secondary">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-kb-border-tertiary border-t-kb-content-primary rounded-full animate-spin" />
          <span>Loading preview...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-kb-content-secondary">
        <div className="flex flex-col items-center gap-3">
          <span className="text-kb-content-danger">
            Failed to load preview
          </span>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-sm text-kb-content-primary underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!preview?.hasContent) {
    return (
      <div className="h-full flex items-center justify-center text-kb-content-secondary">
        <div className="flex flex-col items-center gap-3">
          <span>No content to preview</span>
          <span className="text-sm">
            This email has no HTML content yet. Add content via the API or CLI.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-kb-surface-secondary overflow-auto">
      <iframe
        srcDoc={preview.html}
        title="Email Preview"
        className="w-full h-[2000px] border-0"
        sandbox="allow-same-origin"
      />
    </div>
  );
}

/* ─── Analytics Tab ─── */

function formatNumber(num: number): string {
  return num.toLocaleString();
}

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function AnalyticsTab({
  emailId,
  usedByForms,
  isActive,
}: {
  emailId: string;
  usedByForms: { id: string; name: string }[];
  isActive: boolean;
}) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["marketing-email-stats", emailId],
    queryFn: async () => {
      const response = await fetch(
        `/api/internal/v1/marketing-emails/${emailId}/stats`,
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

  const totalSent = stats.totalSent ?? 0;
  const totalDelivered = stats.totalDelivered ?? 0;
  const totalBounced = stats.totalBounced ?? 0;
  const totalComplained = stats.totalComplained ?? 0;
  const openRate = stats.openRate ?? 0;
  const clickRate = stats.clickRate ?? 0;
  const bounceRate = totalDelivered > 0 ? totalBounced / totalDelivered : 0;
  const complaintRate = totalDelivered > 0 ? totalComplained / totalDelivered : 0;

  return (
    <div className="h-full w-full bg-kb-bg-primary flex flex-col overflow-auto">
      <div className="max-w-6xl mx-auto mt-12 w-full px-6">
        <div className="w-full rounded-xl border border-kb-border-tertiary grid grid-cols-3">
          {/* Delivery Card */}
          <div className="w-full p-5 border-r border-kb-border-tertiary rounded-tl-xl rounded-bl-xl">
            <Text variant="tertiary">Delivery</Text>
            <div className="mt-2 flex items-center justify-between">
              <Heading>{formatNumber(totalDelivered)}</Heading>
              <Badge variant="info" className="rounded-full!">
                {totalSent > 0 ? formatPercent(totalDelivered / totalSent) : "0.0%"}
              </Badge>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2">
                <Text variant="tertiary" className="shrink-0">Bounced</Text>
                <div className="w-full grow h-px bg-kb-border-tertiary" />
                <Text variant="tertiary">{formatNumber(totalBounced)}</Text>
              </div>
            </div>
          </div>

          {/* Engagement Card */}
          <div className="w-full p-5 border-r border-kb-border-tertiary">
            <Text variant="tertiary">Engagement</Text>
            <div className="mt-2 flex items-center justify-between">
              <Text>Open rate</Text>
              <Badge variant="success" className="rounded-full!">
                {formatPercent(openRate)}
              </Badge>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2">
                <Text variant="tertiary" className="shrink-0">Click rate</Text>
                <div className="w-full grow h-px bg-kb-border-tertiary" />
                <Text variant="tertiary">{formatPercent(clickRate)}</Text>
              </div>
            </div>
          </div>

          {/* Health Card */}
          <div className="w-full p-5 rounded-tr-xl rounded-br-xl">
            <Text variant="tertiary">Health</Text>
            <div className="mt-2 flex items-center justify-between">
              <Text>Bounce rate</Text>
              <Badge variant="warning" className="rounded-full!">
                {formatPercent(bounceRate)}
              </Badge>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2">
                <Text variant="tertiary" className="shrink-0">Complained</Text>
                <div className="w-full grow h-px bg-kb-border-tertiary" />
                <Text variant="tertiary">{formatPercent(complaintRate)}</Text>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Details Tab ─── */

function DetailsTab({
  emailId,
  initialSubject,
  initialPreviewText,
  initialTrackClicks,
  initialTrackOpens,
  initialSenderIdentityId,
  initialReplyToIdentityId,
  usedByForms,
  senderIdentities,
  domains,
}: {
  emailId: string;
  initialSubject: string;
  initialPreviewText: string;
  initialTrackClicks: boolean;
  initialTrackOpens: boolean;
  initialSenderIdentityId?: string;
  initialReplyToIdentityId?: string;
  usedByForms: { id: string; name: string }[];
  senderIdentities: TransformedSenderIdentity[];
  domains: { id: string; name: string }[];
}) {
  const { success: toast } = useToast();

  const [subject, setSubject] = useState(initialSubject);
  const [previewText, setPreviewText] = useState(initialPreviewText);
  const [trackClicks, setTrackClicks] = useState(initialTrackClicks);
  const [trackOpens, setTrackOpens] = useState(initialTrackOpens);
  const [senderIdentityId, setSenderIdentityId] = useState(initialSenderIdentityId);
  const [replyToIdentityId, setReplyToIdentityId] = useState(initialReplyToIdentityId);

  // Sender select state
  const [senderLocalPart, setSenderLocalPart] = useState("");
  const [senderDomainId, setSenderDomainId] = useState(domains[0]?.id ?? "");
  const [isAddingNewSender, setIsAddingNewSender] = useState(false);
  const [allDomains, setAllDomains] = useState(domains);
  const [allSenderIdentities, setAllSenderIdentities] = useState(senderIdentities);

  const subjectFieldId = useId();
  const previewTextFieldId = useId();
  const clickTrackingId = useId();
  const openTrackingId = useId();

  const selectedSender = useMemo(() => {
    return allSenderIdentities.find((s) => s.id === senderIdentityId);
  }, [allSenderIdentities, senderIdentityId]);

  const replyToIdentities = useMemo(() => {
    if (!selectedSender) return [];
    return allSenderIdentities.filter((s) => s.domainId === selectedSender.domainId);
  }, [allSenderIdentities, selectedSender]);

  const onDomainCreated = useCallback((domain: CreatedDomain) => {
    setAllDomains((prev) => [...prev, domain]);
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return internalApi.emails().update(emailId, {
        subject,
        previewText,
        trackClicks,
        trackOpens,
        senderIdentityId: senderIdentityId ?? null,
        replyToIdentityId: replyToIdentityId ?? null,
      });
    },
    onSuccess: () => {
      toast("Changes saved");
    },
  });

  return (
    <div className="h-full overflow-auto bg-kb-surface-primary">
      <div className="max-w-xl mx-auto py-8 px-6">
        {/* Email Subject Section */}
        <section>
          <SectionHeader
            title="Email subject"
            description="The subject line and preview text recipients see in their inbox."
          />
          <div className="space-y-4">
            <div>
              <TextField.Root
                id={subjectFieldId}
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Please confirm your subscription"
              >
                <TextField.Label>Subject line</TextField.Label>
                <TextField.Hint>{subject.length}/50 characters</TextField.Hint>
              </TextField.Root>
            </div>
            <div>
              <TextField.Root
                id={previewTextFieldId}
                value={previewText}
                onChange={(event) => setPreviewText(event.target.value)}
                placeholder="Click to confirm your email address..."
              >
                <TextField.Label>Preview text</TextField.Label>
                <TextField.Hint>
                  This text appears after the subject line in most email clients.
                </TextField.Hint>
              </TextField.Root>
            </div>
          </div>
        </section>

        <SectionDivider />

        {/* Sender Details Section */}
        <section>
          <SectionHeader
            title="Sender details"
            description="Choose who this email will be sent from. Recipients will see this in their inbox."
          />
          <div className="flex flex-col gap-4">
            <SenderSelect
              senderIdentities={allSenderIdentities}
              domains={allDomains}
              value={senderIdentityId}
              onChange={setSenderIdentityId}
              onDomainCreated={onDomainCreated}
              localPart={senderLocalPart}
              onLocalPartChange={setSenderLocalPart}
              domainId={senderDomainId}
              onDomainIdChange={setSenderDomainId}
              isAddingNew={isAddingNewSender}
              onIsAddingNewChange={setIsAddingNewSender}
            />
            <ReplyToSelect
              senderIdentities={replyToIdentities}
              value={replyToIdentityId}
              onChange={setReplyToIdentityId}
              disabled={!selectedSender}
            />
          </div>
        </section>

        <SectionDivider />

        {/* Tracking Section */}
        <section>
          <SectionHeader
            title="Tracking"
            description="Choose what engagement metrics to track for this email."
          />
          <div className="flex flex-col gap-4">
            <label
              htmlFor={clickTrackingId}
              className="flex items-start justify-between gap-3 border border-kb-border-tertiary p-3 rounded-lg transition-colors cursor-pointer hover:border-kb-border-secondary"
            >
              <div className="flex flex-col gap-1">
                <Text className="text-kb-content-primary font-medium">Click tracking</Text>
                <Text size="sm" className="text-kb-content-tertiary">
                  Track when recipients click links in your email
                </Text>
              </div>
              <Checkbox
                id={clickTrackingId}
                checked={trackClicks}
                onCheckedChange={(checked) => setTrackClicks(checked === true)}
                variant="circle"
              />
            </label>

            <label
              htmlFor={openTrackingId}
              className="flex items-start justify-between gap-3 border border-kb-border-tertiary p-3 rounded-lg transition-colors cursor-pointer hover:border-kb-border-secondary"
            >
              <div className="flex flex-col gap-1">
                <Text className="text-kb-content-primary font-medium">Open tracking</Text>
                <Text size="sm" className="text-kb-content-tertiary">
                  Track when recipients open your email
                </Text>
              </div>
              <Checkbox
                id={openTrackingId}
                checked={trackOpens}
                onCheckedChange={(checked) => setTrackOpens(checked === true)}
                variant="circle"
              />
            </label>

            <Alert.Root variant="warning" className="gap-4!">
              <Alert.Icon>
                <WarningTriangle />
              </Alert.Icon>
              <Alert.Title>
                Open tracking uses a tracking pixel which may affect deliverability with some email providers.
              </Alert.Title>
            </Alert.Root>
          </div>
        </section>

        {/* Used by Section */}
        {usedByForms.length > 0 && (
          <>
            <SectionDivider />
            <section>
              <SectionHeader
                title="Used by"
                description="Forms and automations that use this email template."
              />
              <div className="flex flex-col gap-3">
                {usedByForms.map((form) => (
                  <Link
                    key={form.id}
                    href={`/w/forms/${form.id}/edit`}
                    className="flex items-center justify-between border border-kb-border-tertiary p-3 rounded-lg transition-colors hover:border-kb-border-secondary"
                  >
                    <div className="flex flex-col gap-1.5">
                      <Text className="text-kb-content-primary font-medium">{form.name}</Text>
                      <Badge size="sm" variant="tertiary" className="rounded-full! w-fit px-2!">Double opt-in form</Badge>
                    </div>
                    <Badge size="sm" variant="info" className="rounded-full!">Form</Badge>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}

        <SectionSaveButton
          onSave={() => saveMutation.mutate()}
          isSaving={saveMutation.isPending}
        />
      </div>
    </div>
  );
}
