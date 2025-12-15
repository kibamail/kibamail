import { ReactNodeViewRenderer } from "@tiptap/react";
import TiptapParagraph from "@tiptap/extension-paragraph";
import { ParagraphNode } from "./paragraph-node";

export const Paragraph = TiptapParagraph.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ParagraphNode);
  },
});

