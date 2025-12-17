import { type Selection } from "@tiptap/pm/state"
import { CellSelection } from "@tiptap/pm/tables"
import type { Editor } from "@tiptap/react"
import { isTextSelection, posToDOMRect } from "@tiptap/react"

import { isNodeSelectionType } from "@/lib/tiptap-utils"

const NODE_TYPE_LABELS: Record<string, string> = {
  paragraph: "Text",
  heading: "Heading",
  blockquote: "Blockquote",
  listItem: "List Item",
  codeBlock: "Code Block",
  table: "Table",
}

export type OverflowPosition = "none" | "top" | "bottom" | "both"

/**
 * Returns a display name for the current node in the editor
 * @param editor The Tiptap editor instance
 * @returns The display name of the current node
 */
export const getNodeDisplayName = (editor: Editor | null): string => {
  if (!editor) return "Node"

  const { selection } = editor.state

  if (isNodeSelectionType(selection)) {
    const nodeType = selection.node.type.name
    return NODE_TYPE_LABELS[nodeType] || nodeType.toLowerCase()
  }

  if (selection instanceof CellSelection) {
    return "Table"
  }

  const { $anchor } = selection
  const nodeType = $anchor.parent.type.name
  return NODE_TYPE_LABELS[nodeType] || nodeType.toLowerCase()
}

/**
 * Determines how a target element overflows relative to a container element
 */
export function getElementOverflowPosition(
  targetElement: Element,
  containerElement: HTMLElement
): OverflowPosition {
  const targetBounds = targetElement.getBoundingClientRect()
  const containerBounds = containerElement.getBoundingClientRect()

  const isOverflowingTop = targetBounds.top < containerBounds.top
  const isOverflowingBottom = targetBounds.bottom > containerBounds.bottom

  if (isOverflowingTop && isOverflowingBottom) return "both"
  if (isOverflowingTop) return "top"
  if (isOverflowingBottom) return "bottom"
  return "none"
}

/**
 * Checks if the current selection is valid for a given editor
 */
export const isSelectionValid = (
  editor: Editor | null,
  selection?: Selection,
  excludedNodeTypes: string[] = ["imageUpload", "horizontalRule", "variable"]
): boolean => {
  if (!editor) return false
  if (!selection) selection = editor.state.selection

  const { state } = editor
  const { doc } = state
  const { empty, from, to } = selection

  const isEmptyTextBlock =
    !doc.textBetween(from, to).length && isTextSelection(selection)
  const isCodeBlock =
    selection.$from.parent.type.spec.code ||
    (isNodeSelectionType(selection) && selection.node.type.spec.code)

  const isButtonBlock = selection.$from.parent.type.name === "button"
  const isExcludedNode =
    isNodeSelectionType(selection) &&
    excludedNodeTypes.includes(selection.node.type.name)
  const isTableCell = selection instanceof CellSelection

  return (
    !empty &&
    !isEmptyTextBlock &&
    !isCodeBlock &&
    !isExcludedNode &&
    !isButtonBlock &&
    !isTableCell
  )
}

/**
 * Checks if the current text selection is valid for editing
 * - Not empty
 * - Not a code block
 * - Not a node selection
 */
export const isTextSelectionValid = (editor: Editor | null): boolean => {
  if (!editor) return false
  const { state } = editor
  const { selection } = state
  const isValid =
    isTextSelection(selection) &&
    !selection.empty &&
    !selection.$from.parent.type.spec.code &&
    !isNodeSelectionType(selection)

  return isValid
}

/**
 * Gets the bounding rect of the current selection in the editor.
 */
export const getSelectionBoundingRect = (editor: Editor): DOMRect | null => {
  const { state } = editor.view
  const { selection } = state
  const { ranges } = selection

  const from = Math.min(...ranges.map((range) => range.$from.pos))
  const to = Math.max(...ranges.map((range) => range.$to.pos))

  if (isNodeSelectionType(selection)) {
    const node = editor.view.nodeDOM(from) as HTMLElement
    if (node) {
      return node.getBoundingClientRect()
    }
  }

  return posToDOMRect(editor.view, from, to)
}
