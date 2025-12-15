import { NodeStylesSection } from "./email-editor-node-styles-section";
import { useActiveNode } from "@/contexts/active-node-context";

export function EmailEditorRightPanel() {
  const { isStylingMode } = useActiveNode();

  return (
    <aside
      className={`email-editor-right-panel ${isStylingMode ? "email-editor-right-panel-visible" : ""}`}
    >
      <div className="email-editor-panel-content">
        <NodeStylesSection />
      </div>
    </aside>
  );
}
