export interface SimulationStep {
  step: number;
  nodeId: string;
  nodeType: string;
  nodeName: string;
  action: string;
  detail: string;
  branch?: string;
}

export interface SimulationResult {
  object: "automation_simulation";
  automationId: string;
  automationName: string;
  contactId: string;
  contactEmail: string;
  status: "completed" | "error";
  errorMessage?: string;
  totalSteps: number;
  steps: SimulationStep[];
}
