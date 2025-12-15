import { ReactNodeViewRenderer } from "@tiptap/react"
import TiptapHeading from "@tiptap/extension-heading"
import { HeadingNode } from "./heading-node"

export const Heading = TiptapHeading.extend({
  addNodeView() {
    return ReactNodeViewRenderer(HeadingNode)
  },
}).configure({
  levels: [1, 2, 3, 4],
})
