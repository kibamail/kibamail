/**
 * Form Preview Route Handler
 *
 * GET /p/forms/[id]/preview — Serves the deployed HTML without tracking views.
 */

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { renderFormHtml, type FormRenderState } from "@/lib/forms/html-renderer";

interface FormContent {
  html: string;
  deployId: string;
  files: Array<{ name: string; url: string; size: number; type: string }>;
}

async function getFormHtml(
  idOrSlug: string,
): Promise<{ html: string } | null> {
  const rootForm = await prisma.form.findFirst({
    where: {
      parentId: null,
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    },
    select: {
      fields: true,
      publishedVersionId: true,
    },
  });

  if (!rootForm) return null;

  if (rootForm.publishedVersionId) {
    const publishedVersion = await prisma.form.findFirst({
      where: { id: rootForm.publishedVersionId },
      select: { fields: true },
    });

    if (publishedVersion) {
      const content = publishedVersion.fields as FormContent | null;
      if (content?.html) return { html: content.html };
    }
  }

  const content = rootForm.fields as FormContent | null;
  if (content?.html) return { html: content.html };

  return null;
}

function parseRenderState(request: NextRequest): FormRenderState {
  const url = new URL(request.url);
  const status = url.searchParams.get("status") as "success" | "error" | null;

  if (!status) return {};

  const state: FormRenderState = { status };

  const errorsParam = url.searchParams.get("errors");
  if (errorsParam) {
    try {
      state.errors = JSON.parse(
        Buffer.from(errorsParam, "base64url").toString("utf-8"),
      );
    } catch {}
  }

  const messageParam = url.searchParams.get("message");
  if (messageParam) {
    try {
      state.message = Buffer.from(messageParam, "base64url").toString("utf-8");
    } catch {}
  }

  const valuesParam = url.searchParams.get("values");
  if (valuesParam) {
    try {
      state.values = JSON.parse(
        Buffer.from(valuesParam, "base64url").toString("utf-8"),
      );
    } catch {}
  }

  return state;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idOrSlug } = await params;

  const result = await getFormHtml(idOrSlug);

  if (!result) {
    return new NextResponse("Form not found", { status: 404 });
  }

  const renderState = parseRenderState(request);
  const html = renderFormHtml(result.html, renderState);

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
