import { ReactNodeViewRenderer } from "@tiptap/react"
import TiptapHorizontalRule from "@tiptap/extension-horizontal-rule"
import { HorizontalRuleNode } from "./horizontal-rule-node"

export const HorizontalRule = TiptapHorizontalRule.extend({
  draggable: true,

  addNodeView() {
    return ReactNodeViewRenderer(HorizontalRuleNode)
  },
})
