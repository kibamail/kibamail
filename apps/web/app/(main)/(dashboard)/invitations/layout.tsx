/**
 * Invitations Layout
 *
 * Simple layout for invitation-related pages.
 * Renders children without the workspace dashboard chrome.
 */

import type { PropsWithChildren } from "react";
import { QueryProvider } from "@/lib/providers/query-provider";

export const dynamic = "force-dynamic";

export default async function InvitationsLayout({
  children,
}: PropsWithChildren) {
  return <QueryProvider>{children}</QueryProvider>;
}
