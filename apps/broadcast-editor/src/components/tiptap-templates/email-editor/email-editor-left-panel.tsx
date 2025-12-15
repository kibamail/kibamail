import { ConfigSection } from "./email-editor-config-section";
import "./email-editor-config-section.scss";
import type { CanvasConfiguration } from "./email-editor";

export interface EmailEditorLeftPanelProps {
  canvasConfiguration?: CanvasConfiguration;
}

export function EmailEditorLeftPanel({
  canvasConfiguration,
}: EmailEditorLeftPanelProps) {
  const isOpen = canvasConfiguration?.open ?? false;

  return (
    <aside
      className={`email-editor-left-panel ${isOpen ? "email-editor-left-panel-visible" : ""}`}
    >
      <div className="email-editor-panel-content">
        <ConfigSection type="body" title="Body" />
        <ConfigSection type="container" title="Container" />
      </div>
    </aside>
  );
}
