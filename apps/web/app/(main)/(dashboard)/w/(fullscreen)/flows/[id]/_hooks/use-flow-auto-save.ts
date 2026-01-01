"use client";

import { useEffect, useRef } from "react";
import { useFlowStore } from "../state/flow-store";
import { useFlowEditor } from "../_components/flow-editor-context";

export function useFlowAutoSave() {
  const { updateAutomation, automation } = useFlowEditor();
  const nodes = useFlowStore((state) => state.nodes);
  const edges = useFlowStore((state) => state.edges);

  const isInitialMount = useRef(true);
  const prevNodesRef = useRef(nodes);
  const prevEdgesRef = useRef(edges);
  const prevAutomationIdRef = useRef(automation?.id);

  // Only auto-save for draft automations
  const canAutoSave = automation?.status === "DRAFT";

  useEffect(() => {
    // Reset refs when automation changes (version switch)
    if (automation?.id !== prevAutomationIdRef.current) {
      isInitialMount.current = true;
      prevAutomationIdRef.current = automation?.id;
      prevNodesRef.current = nodes;
      prevEdgesRef.current = edges;
      return;
    }

    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevNodesRef.current = nodes;
      prevEdgesRef.current = edges;
      return;
    }

    // Skip auto-save if automation is not in draft status
    if (!canAutoSave) {
      return;
    }

    if (nodes !== prevNodesRef.current || edges !== prevEdgesRef.current) {
      prevNodesRef.current = nodes;
      prevEdgesRef.current = edges;
      updateAutomation({ nodes, edges });
    }
  }, [nodes, edges, updateAutomation, canAutoSave, automation?.id]);
}
