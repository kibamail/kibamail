import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import "./variable-node.scss";

export function VariableNodeView({ node, selected }: NodeViewProps) {
  const { name, fallback } = node.attrs;

  // Display format: {{name}} or {{name | fallback}}
  const displayText = fallback ? `${name} | ${fallback}` : name;

  return (
    <NodeViewWrapper
      as="span"
      className={`variable-node ${selected ? "variable-node--selected" : ""}`}
      data-name={name}
      data-fallback={fallback}
    >
      <span className="variable-node__bracket">{"{{ "}</span>
      <span className="variable-node__content">{displayText}</span>
      <span className="variable-node__bracket">{" }}"}</span>
    </NodeViewWrapper>
  );
}
