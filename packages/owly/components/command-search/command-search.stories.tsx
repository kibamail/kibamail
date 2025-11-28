import type { Meta, StoryFn } from "@storybook/react";
import * as React from "react";
import * as CommandSearch from "./command-search";

import "./command-search.css";
import "../text-field/text-field.css";
import "../button/button.css";

const meta: Meta<typeof CommandSearch.Root> = {
  title: "Components/CommandSearch",
  component: CommandSearch.Root,
};

type CommandSearchStoryFn = StoryFn<typeof CommandSearch.Root>;

export const Default: CommandSearchStoryFn = () => {
  return (
    <div className="box">
      <h5>Command Search</h5>
      <p style={{ fontSize: "14px", color: "#666", marginBottom: "16px" }}>
        Click the search bar or press ⌘K (Ctrl+K on Windows) to open the command palette.
      </p>

      <CommandSearch.Root>
        <CommandSearch.Trigger placeholder="Search commands..." />

        <CommandSearch.Content>
          <CommandSearch.Input placeholder="Type a command or search..." />

          <CommandSearch.List>
            <CommandSearch.Empty>No results found.</CommandSearch.Empty>

            <CommandSearch.Group heading="Suggestions">
              <CommandSearch.Item>
                <span>💡 Create new project</span>
              </CommandSearch.Item>
              <CommandSearch.Item>
                <span>📁 Open file</span>
              </CommandSearch.Item>
              <CommandSearch.Item>
                <span>⚙️ Settings</span>
              </CommandSearch.Item>
            </CommandSearch.Group>

            <CommandSearch.Separator />

            <CommandSearch.Group heading="Navigation">
              <CommandSearch.Item>
                <span>🏠 Home</span>
              </CommandSearch.Item>
              <CommandSearch.Item>
                <span>📊 Dashboard</span>
              </CommandSearch.Item>
              <CommandSearch.Item>
                <span>👥 Team</span>
              </CommandSearch.Item>
              <CommandSearch.Item>
                <span>📧 Messages</span>
              </CommandSearch.Item>
            </CommandSearch.Group>

            <CommandSearch.Separator />

            <CommandSearch.Group heading="Actions">
              <CommandSearch.Item>
                <span>✏️ Edit profile</span>
              </CommandSearch.Item>
              <CommandSearch.Item>
                <span>🔔 Notifications</span>
              </CommandSearch.Item>
              <CommandSearch.Item>
                <span>🚪 Sign out</span>
              </CommandSearch.Item>
            </CommandSearch.Group>
          </CommandSearch.List>

          <CommandSearch.Footer />
        </CommandSearch.Content>
      </CommandSearch.Root>
    </div>
  );
};

export const WithControlledState: CommandSearchStoryFn = () => {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="box">
      <h5>Controlled State</h5>
      <p style={{ fontSize: "14px", color: "#666", marginBottom: "16px" }}>
        The command palette state is controlled externally.
      </p>

      <div style={{ marginBottom: "16px" }}>
        <button
          onClick={() => setOpen(!open)}
          style={{
            padding: "8px 16px",
            borderRadius: "4px",
            border: "1px solid #ccc",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          {open ? "Close" : "Open"} Command Palette
        </button>
      </div>

      <CommandSearch.Root open={open} onOpenChange={setOpen}>
        <CommandSearch.Trigger placeholder="Search commands..." />

        <CommandSearch.Content>
          <CommandSearch.Input placeholder="Type a command or search..." />

          <CommandSearch.List>
            <CommandSearch.Empty>No results found.</CommandSearch.Empty>

            <CommandSearch.Group heading="Quick Actions">
              <CommandSearch.Item onSelect={() => alert("Creating new document...")}>
                <span>📄 New document</span>
              </CommandSearch.Item>
              <CommandSearch.Item onSelect={() => alert("Saving...")}>
                <span>💾 Save</span>
              </CommandSearch.Item>
              <CommandSearch.Item onSelect={() => alert("Exporting...")}>
                <span>📤 Export</span>
              </CommandSearch.Item>
            </CommandSearch.Group>
          </CommandSearch.List>

          <CommandSearch.Footer />
        </CommandSearch.Content>
      </CommandSearch.Root>
    </div>
  );
};

export const SimpleExample: CommandSearchStoryFn = () => {
  return (
    <div className="box">
      <h5>Simple Example</h5>
      <p style={{ fontSize: "14px", color: "#666", marginBottom: "16px" }}>
        A minimal command search with just a few items.
      </p>

      <CommandSearch.Root>
        <CommandSearch.Trigger placeholder="Quick search..." />

        <CommandSearch.Content>
          <CommandSearch.Input />

          <CommandSearch.List>
            <CommandSearch.Empty>No results found.</CommandSearch.Empty>

            <CommandSearch.Item>
              <span>Search files</span>
            </CommandSearch.Item>
            <CommandSearch.Item>
              <span>Search projects</span>
            </CommandSearch.Item>
            <CommandSearch.Item>
              <span>Search people</span>
            </CommandSearch.Item>
          </CommandSearch.List>

          <CommandSearch.Footer />
        </CommandSearch.Content>
      </CommandSearch.Root>
    </div>
  );
};

export default meta;
