import { useRef, useState } from "react";
import {
  EmailEditor,
  type EmailEditorRef,
} from "./components/tiptap-templates/email-editor/email-editor";
import { Button } from "@kibamail/owly";

export default function App() {
  const [open, onOpenChange] = useState(false);

  const emailEditorRef = useRef<EmailEditorRef>(null);

  return (
    <div style={{ height: "100vh" }}>
      <div className="example-container-header">
        This is just a sample header.
        <Button onClick={() => onOpenChange(true)}>Styles</Button>
      </div>
      <div style={{ height: "calc(100vh - 64px)" }}>
        <EmailEditor
          placeholder="Start writing..."
          ref={emailEditorRef}
          canvasConfiguration={{
            open,
            styles: {
              body: {
                backgroundColor: "#f4f5f7",
                paddingTop: "24px",
                paddingBottom: "24px",
              },
              container: {
                backgroundColor: "#ffffff",
                borderWidth: "1px",
                borderColor: "#f4f5f7",
              },
              button: {
                backgroundColor: "#49260b",
                color: "#fff",
                paddingLeft: "16px",
                paddingRight: "16px",
                paddingTop: "12px",
                paddingBottom: "12px",
                textAlign: "center",
                borderRadius: "4px",
              },
              horizontalRule: {
                marginTop: "16px",
                marginBottom: "16px",
                backgroundColor: "#e5e5e5",
              },
              paragraph: {
                fontSize: "16px",
                lineHeight: "1.6",
                color: "#333",
                margin: "0px",
              },
              heading: {
                h1: {
                  fontSize: "32px",
                  fontWeight: "bold",
                  margin: "0px",
                  color: "#111",
                },
                h2: {
                  fontSize: "24px",
                  fontWeight: "bold",
                  margin: "0px",
                  color: "#111",
                },
                h3: {
                  fontSize: "20px",
                  fontWeight: 600,
                  margin: "0px",
                  color: "#111",
                },
                h4: {
                  fontSize: "18px",
                  fontWeight: 600,
                  margin: "0px",
                  color: "#111",
                },
              },
            },
            onOpenChange,
          }}
          onChange={console.log}
          variables={[
            "contact.email",
            "contact.first_name",
            "contact.last_name",
            "unsubscribe_url",
            "preferences_url",
            "view_in_browser_url",
          ]}
          allowCustomVariables
          onUpload={async function (_file, _onProgress, _abortSignal) {
            return "/kiba-mascot-pumpkin.jpg";
          }}
        />
      </div>
    </div>
  );
}
