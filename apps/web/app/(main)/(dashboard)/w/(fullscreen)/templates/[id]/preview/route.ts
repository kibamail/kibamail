/**
 * Template Preview Route (Dashboard)
 *
 * GET /w/<slug>/templates/[id]/preview
 *
 * Serves a full-page HTML preview of a template for opening in a browser
 * (or embedding via iframe in the template editor UI).
 *
 * Precedence:
 *   1. If `EmailContent.contentHtml` is set (HTML-only templates uploaded
 *      via /api/v1/transactional-email-templates), render it with
 *      SAMPLE_VARIABLES substituted.
 *   2. Else if `EmailContent.contentJson` is set (visual-editor templates),
 *      run it through `renderBroadcastToHtml` with sample variables.
 *   3. Else render a placeholder.
 *
 * Auth: session (dashboard users only). Workspace-scoped — only the owning
 * workspace can preview.
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  type BroadcastDocument,
  type BroadcastStyles,
  renderBroadcastToHtml,
} from "@/lib/broadcast-renderer";
import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";
import { SAMPLE_VARIABLES } from "@/lib/emails/variables";

const PLACEHOLDER_HTML = `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>No content</title></head>
  <body style="font-family: system-ui, sans-serif; padding: 40px; color: #6b7280;">
    <h2 style="margin:0 0 8px 0; color:#111827;">No content to preview</h2>
    <p>This template has neither <code>contentHtml</code> nor <code>contentJson</code> set yet.</p>
  </body>
</html>`;

function substituteSampleVariables(html: string): string {
  return html.replace(
    /\{\{(\w+(?:\.\w+)*)\}\}/g,
    (match, varName) => SAMPLE_VARIABLES[varName] ?? match,
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = await getSession();
  const workspaceId = session.currentOrganization?.id;

  if (!workspaceId) {
    return new NextResponse("No active workspace", { status: 401 });
  }

  const template = await prisma.emailTemplate.findFirst({
    where: { id, workspaceId },
    include: { emailContent: true },
  });

  if (!template) {
    return new NextResponse("Template not found", { status: 404 });
  }

  const contentHtml = template.emailContent?.contentHtml ?? null;
  const contentJson = template.emailContent?.contentJson ?? null;

  let html: string;

  if (contentHtml) {
    html = substituteSampleVariables(contentHtml);
  } else if (contentJson) {
    const storedStyles = (template.emailContent?.styles as BroadcastStyles) || {};
    html = await renderBroadcastToHtml(
      contentJson as unknown as BroadcastDocument,
      {
        variables: {
          "contact.email": "preview@example.com",
          "contact.first_name": "John",
          "contact.last_name": "Doe",
          unsubscribe_url: "#unsubscribe",
        },
      },
      storedStyles,
    );
  } else {
    html = PLACEHOLDER_HTML;
  }

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      // Allow same-origin framing so the dashboard can embed via iframe.
      "X-Frame-Options": "SAMEORIGIN",
      "Content-Security-Policy": "frame-ancestors 'self'",
    },
  });
}
