import cn from "classnames";
import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import { useEditorConfig } from "@/contexts/editor-config-context";
import "./button-node.scss";

export function ButtonNode(props: NodeViewProps) {
  const { getStyles } = useEditorConfig();
  const defaultButtonStyles = getStyles("button") ?? {};
  const isFullWidth = props.node.attrs.fullWidth;

  // Merge default styles from canvasConfiguration with fullWidth styles and any custom styles on the node
  const buttonStyles = {
    ...defaultButtonStyles,
    width: isFullWidth ? "100%" : "fit-content",
    transition: "width 0.2s ease-in-out",
    ...(props.node.attrs.customStyle ?? {}),
  };

  return (
    <NodeViewWrapper
      className={cn(
        "tiptap-button-node",
        `tiptap-button-node-align-${props.node.attrs.align}`
      )}
    >
      <NodeViewContent style={buttonStyles} className="content is-editable" />
    </NodeViewWrapper>
  );
}
