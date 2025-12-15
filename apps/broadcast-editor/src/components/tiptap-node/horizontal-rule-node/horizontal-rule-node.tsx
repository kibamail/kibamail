import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useEditorConfig } from "@/contexts/editor-config-context";

export function HorizontalRuleNode(props: NodeViewProps) {
  const { getStyles } = useEditorConfig();
  const defaultStyles = getStyles("horizontalRule") ?? {};

  const hrStyles = {
    border: "none",
    height: "1px",
    width: "100%",
    ...defaultStyles,
    ...(props.node.attrs.customStyle ?? {}),
  };

  return (
    <NodeViewWrapper
      style={{ height: "36px", display: "flex", alignItems: "center" }}
    >
      <hr style={hrStyles} />
    </NodeViewWrapper>
  );
}
