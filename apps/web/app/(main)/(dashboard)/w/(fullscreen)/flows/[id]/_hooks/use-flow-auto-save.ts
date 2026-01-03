"use client";

import { useEffect, useRef } from "react";
import { useFlowStore } from "@/app/(main)/(dashboard)/w/(fullscreen)/flows/[id]/state/flow-store";
import { useFlowEditor } from "@/app/(main)/(dashboard)/w/(fullscreen)/flows/[id]/_components/flow-editor-context";

export function useFlowAutoSave() {
  const { updateAutomation, automation } = useFlowEditor();
  const nodes = useFlowStore((state) => state.nodes);
  const edges = useFlowStore((state) => state.edges);

  const isInitialMount = useRef(true);
  const prevNodesRef = useRef(nodes);
  const prevEdgesRef = useRef(edges);
  const prevAutomationIdRef = useRef(automation?.id);

  const canAutoSave = automation?.status === "DRAFT";

  useEffect(() => {
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
