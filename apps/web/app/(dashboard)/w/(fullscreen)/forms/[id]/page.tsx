import {
  DashboardLayoutStickyContentHeaderContainer,
  DashboardLayoutStickyDetailHeader,
  DashboardLayoutStickyDetailHeaderDescription,
  DashboardLayoutStickyDetailHeaderTitle,
} from "@kibamail/owly/dashboard-layout";
import { InputOutput } from "iconoir-react";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";
import { CopyableId } from "./_components/copyable-id";
import { FormSubmissionsTable } from "./_components/form-submissions-table";
import { EditFormButton } from "@/app/(dashboard)/w/(with-sidebar)/forms/_components/edit-form-button";

interface FormDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function FormDetailPage({ params }: FormDetailPageProps) {
  const { id } = await params;
  const session = await getSession();

  if (!session.currentOrganization) {
    throw new Error("No active workspace found");
  }

  const workspaceId = session.currentOrganization.id;

  const form = await prisma.form.findFirst({
    where: {
      id,
      workspaceId,
      parentId: null,
    },
    include: {
      _count: {
        select: {
          submissions: true,
          pageViews: true,
        },
      },
      publishedVersion: true,
      versions: {
        where: { status: "DRAFT" },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!form) {
    notFound();
  }

  const published = form.publishedVersion;
  const draft = form.versions[0];
  const display = published ?? form;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const submissionsToday = await prisma.formSubmission.count({
    where: {
      formId: id,
      workspaceId,
      createdAt: {
        gte: today,
      },
    },
  });

  const submissions = await prisma.formSubmission.findMany({
    where: {
      formId: id,
      workspaceId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
    include: {
      contact: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  const conversionRate =
    form._count.pageViews > 0
      ? `${((form._count.submissions / form._count.pageViews) * 100).toFixed(
          1
        )}%`
      : "—";

  return (
    <DashboardLayoutStickyContentHeaderContainer className="mt-8">
      <DashboardLayoutStickyDetailHeader>
        <div className="flex items-center gap-4 flex-1">
          <div className="w-14 h-14 rounded-full bg-kb-surface-tertiary flex items-center justify-center">
            <InputOutput className="w-6 h-6 text-kb-content-secondary" />
          </div>

          <div className="flex flex-col flex-1">
            <DashboardLayoutStickyDetailHeaderDescription>
              Form
            </DashboardLayoutStickyDetailHeaderDescription>
            <DashboardLayoutStickyDetailHeaderTitle>
              {display.name}
            </DashboardLayoutStickyDetailHeaderTitle>
          </div>

          <EditFormButton
            formId={form.id}
            formName={display.name}
            formStatus={form.status}
            draftVersionId={draft?.id}
          />
        </div>
      </DashboardLayoutStickyDetailHeader>

      <div className="p-6">
        <div className="grid grid-cols-4 gap-6">
          <div>
            <div className="text-xs font-medium text-kb-content-tertiary uppercase mb-2">
              Total Submissions
            </div>
            <div className="text-sm text-kb-content-primary font-medium">
              {form._count.submissions.toLocaleString()}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-kb-content-tertiary uppercase mb-2">
              Submissions Today
            </div>
            <div className="text-sm text-kb-content-primary font-medium">
              {submissionsToday.toLocaleString()}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-kb-content-tertiary uppercase mb-2">
              ID
            </div>
            <CopyableId id={form.id} />
          </div>

          <div>
            <div className="text-xs font-medium text-kb-content-tertiary uppercase mb-2">
              Conversion Rate
            </div>
            <div className="text-sm text-kb-content-primary font-medium">
              {conversionRate}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-sm font-medium text-kb-content-primary mb-4">
            Recent Submissions
          </h3>
          <FormSubmissionsTable submissions={submissions} />
        </div>
      </div>
    </DashboardLayoutStickyContentHeaderContainer>
  );
}
