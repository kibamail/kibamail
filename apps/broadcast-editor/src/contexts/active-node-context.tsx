import React, { createContext, useContext, useState, useCallback } from "react";
import type { Node as TiptapNode } from "@tiptap/pm/model";

export interface ActiveNodeData {
  node: TiptapNode;
  pos: number;
}

export interface ActiveNodeContextValue {
  activeNode: ActiveNodeData | null;
  setActiveNode: (data: ActiveNodeData | null) => void;
  clearActiveNode: () => void;
  isStylingMode: boolean;
  enterStylingMode: (data: ActiveNodeData) => void;
  exitStylingMode: () => void;
}

const ActiveNodeContext = createContext<ActiveNodeContextValue | undefined>(
  undefined
);

export interface ActiveNodeProviderProps {
  children: React.ReactNode;
}

export function ActiveNodeProvider({ children }: ActiveNodeProviderProps) {
  const [activeNode, setActiveNodeState] = useState<ActiveNodeData | null>(
    null
  );
  const [isStylingMode, setIsStylingMode] = useState(false);

  const setActiveNode = useCallback((data: ActiveNodeData | null) => {
    setActiveNodeState(data);
  }, []);

  const clearActiveNode = useCallback(() => {
    setActiveNodeState(null);
  }, []);

  const enterStylingMode = useCallback((data: ActiveNodeData) => {
    setActiveNodeState(data);
    setIsStylingMode(true);
  }, []);

  const exitStylingMode = useCallback(() => {
    setIsStylingMode(false);
    // Delay clearing activeNode to allow slide-out animation to complete
    setTimeout(() => {
      setActiveNodeState(null);
    }, 300); // Match the CSS transition duration
  }, []);

  const value: ActiveNodeContextValue = {
    activeNode,
    setActiveNode,
    clearActiveNode,
    isStylingMode,
    enterStylingMode,
    exitStylingMode,
  };

  return (
    <ActiveNodeContext.Provider value={value}>
      {children}
    </ActiveNodeContext.Provider>
  );
}

export function useActiveNode() {
  const context = useContext(ActiveNodeContext);
  if (!context) {
    throw new Error("useActiveNode must be used within an ActiveNodeProvider");
  }
  return context;
}
