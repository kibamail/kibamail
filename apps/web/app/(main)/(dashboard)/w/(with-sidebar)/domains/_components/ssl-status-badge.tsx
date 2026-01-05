"use client";

import { Badge } from "@kibamail/owly/badge";
import { Button } from "@kibamail/owly/button";
import * as Tooltip from "@kibamail/owly/tooltip";
import {
  Check,
  InfoCircle,
  Lock,
  Refresh,
  WarningTriangle,
} from "iconoir-react";

export type SslStatus = "pending" | "in_progress" | "completed" | "failed" | null;

interface SslStatusBadgeProps {
  status: SslStatus;
  error?: string | null;
  onRetry?: () => void;
  isRetrying?: boolean;
  showInfoTooltip?: boolean;
}

const SSL_INFO_MESSAGE =
  "We automatically secure your tracking domain with HTTPS to ensure click and open tracking works reliably in all email clients.";

export function SslStatusBadge({
  status,
  error,
  onRetry,
  isRetrying,
  showInfoTooltip = false,
}: SslStatusBadgeProps) {
  // Not started - tracking DNS not verified yet
  if (status === null) {
    return (
      <span className="text-kb-content-tertiary text-sm">—</span>
    );
  }

  // Pending - job queued but not started
  if (status === "pending") {
    return (
      <Badge variant="neutral" size="sm">
        <Refresh className="w-3 h-3 animate-spin" />
        Queued
      </Badge>
    );
  }

  // In progress - actively issuing certificate
  if (status === "in_progress") {
    return (
      <Badge variant="info" size="sm">
        <Refresh className="w-3 h-3 animate-spin" />
        Securing...
      </Badge>
    );
  }

  // Completed - SSL certificate issued successfully
  if (status === "completed") {
    const badge = (
      <Badge variant="success" size="sm">
        <Lock className="w-3 h-3" />
        Secured
      </Badge>
    );

    if (showInfoTooltip) {
      return (
        <Tooltip.Root>
          <Tooltip.Trigger asChild>{badge}</Tooltip.Trigger>
          <Tooltip.Content className="max-w-xs">
            <p>{SSL_INFO_MESSAGE}</p>
          </Tooltip.Content>
        </Tooltip.Root>
      );
    }

    return badge;
  }

  // Failed - SSL certificate issuance failed
  if (status === "failed") {
    return (
      <div className="flex items-center gap-2">
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Badge variant="error" size="sm" className="cursor-help">
              <WarningTriangle className="w-3 h-3" />
              Failed
            </Badge>
          </Tooltip.Trigger>
          <Tooltip.Content className="max-w-xs">
            <p className="font-medium mb-1">SSL Certificate Failed</p>
            <p className="text-kb-content-secondary">
              {error || "An error occurred while issuing the SSL certificate."}
            </p>
          </Tooltip.Content>
        </Tooltip.Root>
        {onRetry && (
          <Button
            variant="secondary"
            size="xs"
            onClick={onRetry}
            disabled={isRetrying}
          >
            {isRetrying ? (
              <Refresh className="w-3 h-3 animate-spin" />
            ) : (
              <Refresh className="w-3 h-3" />
            )}
            Retry
          </Button>
        )}
      </div>
    );
  }

  return null;
}

/**
 * SSL info section for domain detail page
 */
export function SslInfoSection({
  status,
  error,
  onRetry,
  isRetrying,
}: SslStatusBadgeProps) {
  return (
    <div className="rounded-lg border border-kb-border bg-kb-surface p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-kb-surface-secondary p-2">
          <Lock className="w-4 h-4 text-kb-content-secondary" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-kb-content mb-1">
            SSL Certificate
          </h3>
          <p className="text-sm text-kb-content-secondary mb-3">
            {SSL_INFO_MESSAGE}
          </p>
          <div className="flex items-center gap-3">
            <SslStatusBadge
              status={status}
              error={error}
              onRetry={onRetry}
              isRetrying={isRetrying}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
