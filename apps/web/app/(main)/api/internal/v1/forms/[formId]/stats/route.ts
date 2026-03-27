/**
 * Form Stats Route (Internal API)
 *
 * GET /api/internal/v1/forms/[formId]/stats
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ErrorCode } from "@/lib/api/error-codes";
import { NotFoundError } from "@/lib/api/errors";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: Promise<{ formId: string }>;
}

function round(value: number, decimals: number): number {
  return Math.round(value * 10 ** decimals) / 10 ** decimals;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { formId } = await params;

  return withErrorHandling(request, () =>
    withSession(request, async (session) => {
      if (!session.currentOrganization) {
        throw new Error("No active workspace found");
      }

      const workspaceId = session.currentOrganization.id;

      const form = await prisma.form.findFirst({
        where: { id: formId, workspaceId },
      });

      if (!form) {
        throw new NotFoundError("Form not found", ErrorCode.FORM_NOT_FOUND);
      }

      const rootFormId = form.parentId ?? form.id;

      const [views, submissions] = await Promise.all([
        prisma.pageView.count({
          where: { formId: rootFormId, workspaceId },
        }),
        prisma.formSubmission.count({
          where: { formId: rootFormId, workspaceId },
        }),
      ]);

      const conversionRate = views > 0 ? round(submissions / views, 4) : 0;

      return NextResponse.json(
        { views, submissions, conversionRate },
        { status: 200 },
      );
    }),
  );
}
