import type { Meta, StoryFn } from "@storybook/react";
import * as React from "react";
import * as DropdownMenu from "./dropdown-menu";
import { Button } from "../button/button";

import "./dropdown-menu.css";
import "../button/button.css";

const meta: Meta<typeof DropdownMenu> = {
  title: "Components/DropdownMenu",
};

type DropdownMenuStoryFn = StoryFn<typeof DropdownMenu>;

export const Default: DropdownMenuStoryFn = () => {
  return (
    <div style={{ padding: "100px" }}>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button variant="secondary">Open Menu</Button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Content align="start">
          <DropdownMenu.Item>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Profile
          </DropdownMenu.Item>
          <DropdownMenu.Item>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Settings
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Log out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  );
};

export const WithLabels: DropdownMenuStoryFn = () => {
  return (
    <div style={{ padding: "100px" }}>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button variant="secondary">Open Menu</Button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Content>
          <DropdownMenu.Label>My Account</DropdownMenu.Label>
          <DropdownMenu.Item>Profile</DropdownMenu.Item>
          <DropdownMenu.Item>Billing</DropdownMenu.Item>
          <DropdownMenu.Item>Settings</DropdownMenu.Item>

          <DropdownMenu.Separator />

          <DropdownMenu.Label>Team</DropdownMenu.Label>
          <DropdownMenu.Item>Team Settings</DropdownMenu.Item>
          <DropdownMenu.Item>Invite Members</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  );
};

export const WithCheckboxes: DropdownMenuStoryFn = () => {
  const [showStatusBar, setShowStatusBar] = React.useState(true);
  const [showActivityBar, setShowActivityBar] = React.useState(false);
  const [showPanel, setShowPanel] = React.useState(false);

  return (
    <div style={{ padding: "100px" }}>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button variant="secondary">View Options</Button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Content>
          <DropdownMenu.Label>Appearance</DropdownMenu.Label>
          <DropdownMenu.CheckboxItem
            checked={showStatusBar}
            onCheckedChange={setShowStatusBar}
          >
            Status Bar
            <DropdownMenu.ItemIndicator />
          </DropdownMenu.CheckboxItem>
          <DropdownMenu.CheckboxItem
            checked={showActivityBar}
            onCheckedChange={setShowActivityBar}
          >
            Activity Bar
            <DropdownMenu.ItemIndicator />
          </DropdownMenu.CheckboxItem>
          <DropdownMenu.CheckboxItem
            checked={showPanel}
            onCheckedChange={setShowPanel}
          >
            Panel
            <DropdownMenu.ItemIndicator />
          </DropdownMenu.CheckboxItem>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  );
};

export const WithRadioGroup: DropdownMenuStoryFn = () => {
  const [position, setPosition] = React.useState("top");

  return (
    <div style={{ padding: "100px" }}>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button variant="secondary">Position: {position}</Button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Content>
          <DropdownMenu.Label>Panel Position</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={position} onValueChange={setPosition}>
            <DropdownMenu.RadioItem value="top">
              Top
              <DropdownMenu.ItemIndicator />
            </DropdownMenu.RadioItem>
            <DropdownMenu.RadioItem value="bottom">
              Bottom
              <DropdownMenu.ItemIndicator />
            </DropdownMenu.RadioItem>
            <DropdownMenu.RadioItem value="right">
              Right
              <DropdownMenu.ItemIndicator />
            </DropdownMenu.RadioItem>
            <DropdownMenu.RadioItem value="left">
              Left
              <DropdownMenu.ItemIndicator />
            </DropdownMenu.RadioItem>
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  );
};

export const WithDisabledItems: DropdownMenuStoryFn = () => {
  return (
    <div style={{ padding: "100px" }}>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button variant="secondary">Open Menu</Button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Content>
          <DropdownMenu.Item>New Tab</DropdownMenu.Item>
          <DropdownMenu.Item>New Window</DropdownMenu.Item>
          <DropdownMenu.Item disabled>New Private Window (Disabled)</DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item>Close Tab</DropdownMenu.Item>
          <DropdownMenu.Item disabled>Close Window (Disabled)</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  );
};

export const Alignment: DropdownMenuStoryFn = () => {
  return (
    <div style={{ padding: "100px", display: "flex", gap: "20px", flexWrap: "wrap" }}>
      <div>
        <p style={{ marginBottom: "8px", fontSize: "12px", color: "#666" }}>align="start"</p>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <Button variant="secondary">Align Start</Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="start">
            <DropdownMenu.Item>Profile</DropdownMenu.Item>
            <DropdownMenu.Item>Settings</DropdownMenu.Item>
            <DropdownMenu.Item>Log out</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>

      <div>
        <p style={{ marginBottom: "8px", fontSize: "12px", color: "#666" }}>align="center" (default)</p>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <Button variant="secondary">Align Center</Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="center">
            <DropdownMenu.Item>Profile</DropdownMenu.Item>
            <DropdownMenu.Item>Settings</DropdownMenu.Item>
            <DropdownMenu.Item>Log out</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>

      <div>
        <p style={{ marginBottom: "8px", fontSize: "12px", color: "#666" }}>align="end"</p>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <Button variant="secondary">Align End</Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end">
            <DropdownMenu.Item>Profile</DropdownMenu.Item>
            <DropdownMenu.Item>Settings</DropdownMenu.Item>
            <DropdownMenu.Item>Log out</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
    </div>
  );
};

export const Sides: DropdownMenuStoryFn = () => {
  return (
    <div style={{ padding: "200px", display: "flex", gap: "40px", justifyContent: "center" }}>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button variant="secondary">side="top"</Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content side="top" align="start">
          <DropdownMenu.Item>Profile</DropdownMenu.Item>
          <DropdownMenu.Item>Settings</DropdownMenu.Item>
          <DropdownMenu.Item>Log out</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button variant="secondary">side="right"</Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content side="right" align="start">
          <DropdownMenu.Item>Profile</DropdownMenu.Item>
          <DropdownMenu.Item>Settings</DropdownMenu.Item>
          <DropdownMenu.Item>Log out</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button variant="secondary">side="bottom"</Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content side="bottom" align="start">
          <DropdownMenu.Item>Profile</DropdownMenu.Item>
          <DropdownMenu.Item>Settings</DropdownMenu.Item>
          <DropdownMenu.Item>Log out</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button variant="secondary">side="left"</Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content side="left" align="start">
          <DropdownMenu.Item>Profile</DropdownMenu.Item>
          <DropdownMenu.Item>Settings</DropdownMenu.Item>
          <DropdownMenu.Item>Log out</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  );
};

export default meta;
