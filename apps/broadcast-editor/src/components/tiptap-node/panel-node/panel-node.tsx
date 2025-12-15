"use client";

import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";

// --- Styles ---
import "./panel-node.scss";

export function PanelNode(props: NodeViewProps) {
  return (
    <NodeViewWrapper className="panel-node">
      <NodeViewContent
        className="panel-node-content"
        style={props.node.attrs.customStyle ?? {}}
      />
    </NodeViewWrapper>
  );
}
