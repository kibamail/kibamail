"use client";

import { Badge } from "@kibamail/owly/badge";
import type { EventType } from "@prisma/client";
import {
  Check,
  Clock,
  Eye,
  Mail,
  WarningCircle,
  Xmark,
  Link as LinkIcon,
  Globe,
  Server,
} from "iconoir-react";

interface TimelineEvent {
  id: string;
  type: EventType;
  createdAt: Date;
  responseCode: number | null;
  responseContent: string | null;
  bounceClassification: string | null;
  originCountry: string | null;
  originCity: string | null;
  originDevice: string | null;
  originBrowser: string | null;
  peerAddressName: string | null;
}

interface EmailTimelineProps {
  events: TimelineEvent[];
}

function getEventIcon(type: EventType) {
  switch (type) {
    case "Queued":
      return <Clock className="w-4 h-4 text-kb-content-warning" />;
    case "Delivery":
      return <Check className="w-4 h-4 text-kb-content-success" />;
    case "Bounce":
    case "AdminBounce":
    case "OOB":
      return <Xmark className="w-4 h-4 text-kb-content-error" />;
    case "Feedback":
      return <WarningCircle className="w-4 h-4 text-kb-content-error" />;
    case "Open":
      return <Eye className="w-4 h-4 text-kb-content-info" />;
    case "Click":
      return <LinkIcon className="w-4 h-4 text-kb-content-info" />;
    case "Rejection":
    case "Expiration":
      return <Xmark className="w-4 h-4 text-kb-content-error" />;
    default:
      return <Mail className="w-4 h-4 text-kb-content-tertiary" />;
  }
}

function getEventLabel(type: EventType): string {
  switch (type) {
    case "Queued":
      return "Email Queued";
    case "Delivery":
      return "Email Delivered";
    case "Bounce":
      return "Email Bounced";
    case "AdminBounce":
      return "Admin Bounce";
    case "OOB":
      return "Out-of-Band Bounce";
    case "Feedback":
      return "Spam Complaint";
    case "Open":
      return "Email Opened";
    case "Click":
      return "Link Clicked";
    case "Rejection":
      return "Email Rejected";
    case "Expiration":
      return "Email Expired";
    case "TransientFailure":
      return "Temporary Failure";
    default:
      return type;
  }
}

function getEventBadgeVariant(
  type: EventType
): "success" | "error" | "warning" | "info" | "neutral" {
  switch (type) {
    case "Delivery":
      return "success";
    case "Bounce":
    case "AdminBounce":
    case "OOB":
    case "Feedback":
    case "Rejection":
    case "Expiration":
      return "error";
    case "Queued":
    case "TransientFailure":
      return "warning";
    case "Open":
    case "Click":
      return "info";
    default:
      return "neutral";
  }
}

function formatDateTime(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function EmailTimeline({ events }: EmailTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-kb-content-tertiary">
        No events recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <div key={event.id} className="relative flex gap-4">
          {index < events.length - 1 && (
            <div className="absolute left-[19px] top-10 bottom-0 w-px bg-kb-border-primary" />
          )}

          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-kb-surface-secondary flex items-center justify-center border border-kb-border-primary">
            {getEventIcon(event.type)}
          </div>

          <div className="flex-grow pb-6">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={getEventBadgeVariant(event.type)} size="sm">
                {getEventLabel(event.type)}
              </Badge>
              <span className="text-sm text-kb-content-tertiary">
                {formatDateTime(event.createdAt)}
              </span>
            </div>

            <div className="space-y-2">
              {event.responseCode && (
                <div className="flex items-center gap-2 text-sm">
                  <Server className="w-4 h-4 text-kb-content-tertiary" />
                  <span className="text-kb-content-secondary">
                    Response: {event.responseCode}
                    {event.responseContent && ` - ${event.responseContent}`}
                  </span>
                </div>
              )}

              {event.bounceClassification && (
                <div className="flex items-center gap-2 text-sm">
                  <WarningCircle className="w-4 h-4 text-kb-content-error" />
                  <span className="text-kb-content-secondary">
                    Bounce Type: {event.bounceClassification}
                  </span>
                </div>
              )}

              {(event.originCountry || event.originDevice) && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="w-4 h-4 text-kb-content-tertiary" />
                  <span className="text-kb-content-secondary">
                    {[
                      event.originCity,
                      event.originCountry,
                      event.originDevice,
                      event.originBrowser,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
              )}

              {event.peerAddressName && (
                <div className="flex items-center gap-2 text-sm">
                  <Server className="w-4 h-4 text-kb-content-tertiary" />
                  <span className="text-kb-content-secondary">
                    Server: {event.peerAddressName}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
