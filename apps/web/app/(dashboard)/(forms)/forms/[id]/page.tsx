import { Badge, Button } from "@kibamail/owly";
import { Xmark } from "iconoir-react";
import { FormCanvas } from "./_components/form-canvas";
import { FormHelpPopover } from "./_components/form-help-popover";
import { FormHeader } from "./_components/form-header";
import { PublishFormDialog } from "./_components/publish-form-dialog";
import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

async function getForm(workspaceId: string, formId: string) {
  const form = await prisma.form.findFirst({
    where: {
      id: formId,
      workspaceId,
    },
  });

  if (!form) {
    return null;
  }

  return form;
}

export default async function FormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();

  if (!session.currentOrganization) {
    throw new Error("No active workspace found");
  }

  const form = await getForm(session.currentOrganization.id, id);

  if (!form) {
    notFound();
  }

  return (
    <div className="w-full h-screen flex box-border flex-col px-2 pb-2 bg-kb-bg-layout">
      <div className="h-[60px] w-full flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="tertiary" asChild>
            <a href={"/w/forms"}>
              <Xmark className="w-6! h-6!" />
            </a>
          </Button>

          <FormHeader form={form} />
        </div>
        <FormHelpPopover />

        <div className="flex items-center gap-4">
          <Badge
            variant={
              form.status === "PUBLISHED"
                ? "success"
                : form.status === "DRAFT"
                ? "neutral"
                : "warning"
            }
          >
            {form.status === "PUBLISHED"
              ? "Live"
              : form.status === "DRAFT"
              ? "Draft"
              : "Archived"}
          </Badge>
          <PublishFormDialog formId={form.id} formName={form.name} />
        </div>
      </div>

      <div className="grow border border-kb-border-tertiary rounded-lg flex max-w-full">
        <div
          className="grow h-[calc(100vh-67px)] overflow-hidden"
          id="form-canvas-container-wrapper"
        >
          <FormCanvas />
        </div>
        {/* <FormComposerSidebar /> */}
      </div>
    </div>
  );
}
