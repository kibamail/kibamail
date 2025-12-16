import { ConfigSection } from "./email-editor-config-section";
import { HeadingConfigSection } from "./heading-config-section";
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
        <ConfigSection
          type="body"
          title="Body"
          properties={["backgroundColor", "padding", "borderWidth", "borderColor"]}
          defaultExpanded
        />
        <ConfigSection
          type="container"
          title="Container"
          properties={["backgroundColor", "padding", "margin", "borderRadius", "borderWidth", "borderColor"]}
          defaultExpanded
        />
        <HeadingConfigSection />
        <ConfigSection
          type="paragraph"
          title="Paragraph"
          properties={["backgroundColor", "padding", "margin"]}
        />
        <ConfigSection
          type="button"
          title="Button"
          properties={["backgroundColor", "padding", "margin", "borderRadius"]}
        />
        <ConfigSection
          type="link"
          title="Link"
          properties={["color"]}
        />
        <ConfigSection
          type="image"
          title="Image"
          properties={["margin", "borderRadius"]}
        />
        <ConfigSection
          type="horizontalRule"
          title="Divider"
          properties={["backgroundColor", "margin"]}
        />
        <ConfigSection
          type="codeblock"
          title="Code Block"
          properties={["backgroundColor", "padding", "margin", "borderRadius"]}
        />
      </div>
    </aside>
  );
}
