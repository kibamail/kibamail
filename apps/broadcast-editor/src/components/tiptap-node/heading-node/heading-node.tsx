import type { CSSProperties } from "react"
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from "@tiptap/react"
import { useEditorConfig } from "@/contexts/editor-config-context"
import type { HeadingLevel } from "@/types/editor-config"

export function HeadingNode(props: NodeViewProps) {
  const { getHeadingStyles } = useEditorConfig()
  const level = props.node.attrs.level as HeadingLevel

  // Get default styles for this heading level
  const defaultStyles = getHeadingStyles(level) ?? {}

  const textAlign = props.node.attrs.textAlign as CSSProperties["textAlign"] | undefined

  // Merge default styles with any custom styles on the node
  const headingStyles: CSSProperties = {
    ...defaultStyles,
    ...(props.node.attrs.customStyle ?? {}),
    ...(textAlign ? { textAlign } : {}),
  }

  // Render the appropriate heading element based on level
  return (
    <NodeViewWrapper>
      {level === 1 && (
        <h1 style={headingStyles} data-text-align={textAlign}>
          <NodeViewContent />
        </h1>
      )}
      {level === 2 && (
        <h2 style={headingStyles} data-text-align={textAlign}>
          <NodeViewContent />
        </h2>
      )}
      {level === 3 && (
        <h3 style={headingStyles} data-text-align={textAlign}>
          <NodeViewContent />
        </h3>
      )}
      {level === 4 && (
        <h4 style={headingStyles} data-text-align={textAlign}>
          <NodeViewContent />
        </h4>
      )}
    </NodeViewWrapper>
  )
}
