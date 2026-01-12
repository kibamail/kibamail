"use client";

import { Badge } from "@kibamail/owly/badge";
import type { EventType } from "@prisma/client";
import {
  Check,
  Clock,
  Eye,
  Mail,
  RefreshDouble,
  WarningCircle,
  Xmark,
} from "iconoir-react";

/**
 * Get status badge based on latest event type
 * Used by both the emails table and email detail page for consistency
 */
export function EmailStatusBadge({ eventType }: { eventType: EventType | null }) {
  if (!eventType) {
    return (
      <Badge variant="neutral" size="sm">
        <Clock className="w-3 h-3" />
        Pending
      </Badge>
    );
  }

  switch (eventType) {
    case "Queued":
      return (
        <Badge variant="warning" size="sm">
          <Clock className="w-3 h-3" />
          Queued
        </Badge>
      );
    case "Reception":
      return (
        <Badge variant="info" size="sm">
          <Mail className="w-3 h-3" />
          Received
        </Badge>
      );
    case "Delivery":
      return (
        <Badge variant="success" size="sm">
          <Check className="w-3 h-3" />
          Delivered
        </Badge>
      );
    case "Bounce":
    case "AdminBounce":
    case "OOB":
      return (
        <Badge variant="error" size="sm">
          <Xmark className="w-3 h-3" />
          Bounced
        </Badge>
      );
    case "TransientFailure":
      return (
        <Badge variant="warning" size="sm">
          <RefreshDouble className="w-3 h-3" />
          Temporary failure
        </Badge>
      );
    case "Feedback":
      return (
        <Badge variant="error" size="sm">
          <WarningCircle className="w-3 h-3" />
          Complained
        </Badge>
      );
    case "Rejection":
    case "Expiration":
      return (
        <Badge variant="error" size="sm">
          <Xmark className="w-3 h-3" />
          Failed
        </Badge>
      );
    case "Open":
      return (
        <Badge variant="success" size="sm">
          <Eye className="w-3 h-3" />
          Opened
        </Badge>
      );
    case "Click":
      return (
        <Badge variant="success" size="sm">
          <Check className="w-3 h-3" />
          Clicked
        </Badge>
      );
    default:
      return (
        <Badge variant="neutral" size="sm">
          {eventType}
        </Badge>
      );
  }
}
