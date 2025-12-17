import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import { useEditorConfig } from "@/contexts/editor-config-context";

export function ParagraphNode(props: NodeViewProps) {
  const { getStyles } = useEditorConfig();
  const defaultStyles = getStyles("paragraph") ?? {};

  const paragraphStyles = {
    ...defaultStyles,
    ...(props.node.attrs.customStyle ?? {}),
  };

  return (
    <NodeViewWrapper>
      <div style={paragraphStyles} data-text-align={props.node.attrs.textAlign}>
        <NodeViewContent />
      </div>
    </NodeViewWrapper>
  );
}
