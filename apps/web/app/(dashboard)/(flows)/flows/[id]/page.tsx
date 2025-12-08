import { Badge, Button, Heading } from "@kibamail/owly";
import { EditPencil, Xmark } from "iconoir-react";
import { FlowCanvas } from "./_components/canvas/flow";
import { FlowComposerSidebar } from "./_components/flow-composer-sidebar";

export default function FlowPage() {
  return (
    <div className="w-full h-screen flex box-border flex-col px-2 pb-2">
      <div className="h-[60px] w-full flex items-center justify-between px-3 shrink-0 bg-kb-bg-layout">
        <div className="flex items-center gap-4">
          <Button variant="tertiary" asChild>
            <a href={"/w/automations"}>
              <Xmark className="w-6! h-6!" />
            </a>
          </Button>

          <Heading
            size="xs"
            className="mb-0 flex items-center text-kb-content-tertiary"
          >
            {"Untitled Flow"}

            <Button variant="tertiary" size="sm" className="ml-2">
              <EditPencil className="kb-content-tertiary" />
            </Button>
          </Heading>
        </div>

        <div className="flex items-center gap-4">
          <Badge variant="neutral">Draft</Badge>
          <Button>Publish</Button>
        </div>
      </div>

      <div className="grow border border-kb-border-tertiary rounded-lg flex max-w-full">
        <div
          className="grow h-[calc(100vh-67px)] overflow-hidden"
          id="automation-flow-container-wrapper"
        >
          <FlowCanvas />
        </div>
        <FlowComposerSidebar />
      </div>
    </div>
  );
}
