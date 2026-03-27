import type { Automation, AutomationRun, Contact } from "@prisma/client";

export interface ExecutionContext {
  run: AutomationRun;
  automation: Automation;
  contact: Contact;
  workspaceId: string;
}

export type ActionExecutor = (
  ctx: ExecutionContext,
  nodeData: Record<string, unknown>,
) => Promise<void>;
