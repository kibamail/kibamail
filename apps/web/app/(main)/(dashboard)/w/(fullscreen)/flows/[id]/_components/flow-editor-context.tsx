"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Edge, Node } from "@xyflow/react";
import { useDebouncedCallback } from "use-debounce";
import { useMutation } from "@/hooks/use-mutation";
import { internalApi } from "@/lib/api/client";
import type {
  AutomationResponse,
  UpdateAutomationInput,
} from "@/app/(main)/api/v1/automations/schema";
import type { ValidationError } from "@/lib/automations/validation";

type SaveStatus = "idle" | "saving" | "success" | "error";

type NodeErrorsMap = Map<string, ValidationError[]>;

interface FlowEditorContextValue {
  automationId: string;
  automation: AutomationResponse | null;
  saveStatus: SaveStatus;
  save: () => void;
  hasUnsavedChanges: boolean;
  updateAutomation: (data: {
    name?: string;
    description?: string | null;
    nodes?: Node[];
    edges?: Edge[];
  }) => void;
  nodeErrors: NodeErrorsMap;
  setNodeErrors: (errors: ValidationError[]) => void;
  clearNodeErrors: () => void;
  getNodeErrors: (nodeId: string) => ValidationError[];
}

const FlowEditorContext = createContext<FlowEditorContextValue | null>(null);

interface FlowEditorProviderProps {
  automationId: string;
  initialAutomation: AutomationResponse;
  children: ReactNode;
}

export function FlowEditorProvider({
  automationId,
  initialAutomation,
  children,
}: FlowEditorProviderProps) {
  const [automation, setAutomation] = useState<AutomationResponse | null>(
    initialAutomation
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [nodeErrors, setNodeErrorsState] = useState<NodeErrorsMap>(new Map());

  const pendingDataRef = useRef<UpdateAutomationInput | null>(null);
  const successTimerRef = useRef<NodeJS.Timeout | null>(null);

  const setNodeErrors = useCallback((errors: ValidationError[]) => {
    const errorsMap = new Map<string, ValidationError[]>();
    for (const error of errors) {
      const key = error.nodeId || "flow";
      if (!errorsMap.has(key)) {
        errorsMap.set(key, []);
      }
      errorsMap.get(key)!.push(error);
    }
    setNodeErrorsState(errorsMap);
  }, []);

  const clearNodeErrors = useCallback(() => {
    setNodeErrorsState(new Map());
  }, []);

  const getNodeErrors = useCallback(
    (nodeId: string): ValidationError[] => {
      return nodeErrors.get(nodeId) || [];
    },
    [nodeErrors]
  );

  const { mutate: performUpdate } = useMutation({
    mutationFn: async (data: UpdateAutomationInput) => {
      return await internalApi.automations().update(automationId, data);
    },
    onSuccess: (data) => {
      setAutomation(data);
      setSaveStatus("success");
      setHasUnsavedChanges(false);
      pendingDataRef.current = null;

      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }

      successTimerRef.current = setTimeout(() => {
        setSaveStatus("idle");
      }, 2000);
    },
    onError: () => {
      setSaveStatus("error");
      setTimeout(() => {
        setSaveStatus("idle");
      }, 3000);
    },
  });

  const debouncedSave = useDebouncedCallback(() => {
    if (pendingDataRef.current) {
      setSaveStatus("saving");
      performUpdate(pendingDataRef.current);
    }
  }, 1500);

  const save = useCallback(() => {
    debouncedSave.flush();
    if (pendingDataRef.current) {
      setSaveStatus("saving");
      performUpdate(pendingDataRef.current);
    }
  }, [debouncedSave, performUpdate]);

  const updateAutomation = useCallback(
    (data: {
      name?: string;
      description?: string | null;
      nodes?: Node[];
      edges?: Edge[];
    }) => {
      const update: UpdateAutomationInput = {
        ...pendingDataRef.current,
      };

      if (data.name !== undefined) update.name = data.name;
      if (data.description !== undefined) update.description = data.description;
      if (data.nodes !== undefined) {
        update.nodes = data.nodes as unknown as UpdateAutomationInput["nodes"];
      }
      if (data.edges !== undefined) {
        update.edges = data.edges as unknown as UpdateAutomationInput["edges"];
      }

      pendingDataRef.current = update;
      setHasUnsavedChanges(true);
      debouncedSave();
    },
    [debouncedSave]
  );

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  return (
    <FlowEditorContext.Provider
      value={{
        automationId,
        automation,
        saveStatus,
        save,
        hasUnsavedChanges,
        updateAutomation,
        nodeErrors,
        setNodeErrors,
        clearNodeErrors,
        getNodeErrors,
      }}
    >
      {children}
    </FlowEditorContext.Provider>
  );
}

export function useFlowEditor() {
  const context = useContext(FlowEditorContext);

  if (!context) {
    throw new Error("useFlowEditor must be used within a FlowEditorProvider");
  }

  return context;
}
