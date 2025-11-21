/**
 * Invitations Layout
 *
 * Simple layout for invitation-related pages.
 * Renders children without the workspace dashboard chrome.
 */

import { QueryProvider } from "@/lib/providers/query-provider";
import { ToastProvider } from "@kibamail/owly/toast";
import type { PropsWithChildren } from "react";

export default async function InvitationsLayout({
  children,
}: PropsWithChildren) {
  return (
    <QueryProvider>
      <ToastProvider>{children}</ToastProvider>
    </QueryProvider>
  );
}
