import type { Meta, StoryFn } from "@storybook/react";
import * as React from "react";
import * as Popover from "./popover";
import { Button } from "../button/button";
import { Text } from "../text/text";
import { Heading } from "../heading/heading";

import "./popover.css";
import "../button/button.css";
import "../text/text.css";
import "../heading/heading.css";

const meta: Meta<typeof Popover> = {
  title: "Components/Popover",
};

type PopoverStoryFn = StoryFn<typeof Popover>;

export const Default: PopoverStoryFn = () => {
  return (
    <div style={{ padding: "100px" }}>
      <Popover.Root>
        <Popover.Trigger>
          <Button variant="secondary">Open Popover</Button>
        </Popover.Trigger>
        <Popover.Content>
          <div style={{ padding: "var(--sp-md)" }}>
            <Heading size="xs" style={{ marginBottom: "var(--sp-sm)" }}>
              Popover Title
            </Heading>
            <Text size="sm" style={{ color: "var(--content-secondary)" }}>
              This is a popover content area. You can put any content here.
            </Text>
          </div>
        </Popover.Content>
      </Popover.Root>
    </div>
  );
};

export const WithArrow: PopoverStoryFn = () => {
  return (
    <div style={{ padding: "100px" }}>
      <Popover.Root>
        <Popover.Trigger>
          <Button variant="secondary">Open Popover with Arrow</Button>
        </Popover.Trigger>
        <Popover.Content>
          <Popover.Arrow />
          <div style={{ padding: "var(--sp-md)" }}>
            <Heading size="xs" style={{ marginBottom: "var(--sp-sm)" }}>
              Popover with Arrow
            </Heading>
            <Text size="sm" style={{ color: "var(--content-secondary)" }}>
              This popover includes an arrow pointing to the trigger.
            </Text>
          </div>
        </Popover.Content>
      </Popover.Root>
    </div>
  );
};

export const WithCloseButton: PopoverStoryFn = () => {
  return (
    <div style={{ padding: "100px" }}>
      <Popover.Root>
        <Popover.Trigger>
          <Button variant="secondary">Open Popover</Button>
        </Popover.Trigger>
        <Popover.Content>
          <div style={{ padding: "var(--sp-md)" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "var(--sp-sm)",
              }}
            >
              <Heading size="xs">Settings</Heading>
              <Popover.Close asChild>
                <Button variant="secondary" size="sm">
                  ×
                </Button>
              </Popover.Close>
            </div>
            <Text size="sm" style={{ color: "var(--content-secondary)" }}>
              Configure your preferences here.
            </Text>
          </div>
        </Popover.Content>
      </Popover.Root>
    </div>
  );
};

export const Sides: PopoverStoryFn = () => {
  return (
    <div
      style={{
        padding: "200px",
        display: "flex",
        gap: "40px",
        justifyContent: "center",
      }}
    >
      <Popover.Root>
        <Popover.Trigger>
          <Button variant="secondary">side="top"</Button>
        </Popover.Trigger>
        <Popover.Content side="top" align="start">
          <div style={{ padding: "var(--sp-md)" }}>
            <Text size="sm">Top positioned popover</Text>
          </div>
        </Popover.Content>
      </Popover.Root>

      <Popover.Root>
        <Popover.Trigger>
          <Button variant="secondary">side="right"</Button>
        </Popover.Trigger>
        <Popover.Content side="right" align="start">
          <div style={{ padding: "var(--sp-md)" }}>
            <Text size="sm">Right positioned popover</Text>
          </div>
        </Popover.Content>
      </Popover.Root>

      <Popover.Root>
        <Popover.Trigger>
          <Button variant="secondary">side="bottom"</Button>
        </Popover.Trigger>
        <Popover.Content side="bottom" align="start">
          <div style={{ padding: "var(--sp-md)" }}>
            <Text size="sm">Bottom positioned popover</Text>
          </div>
        </Popover.Content>
      </Popover.Root>

      <Popover.Root>
        <Popover.Trigger>
          <Button variant="secondary">side="left"</Button>
        </Popover.Trigger>
        <Popover.Content side="left" align="start">
          <div style={{ padding: "var(--sp-md)" }}>
            <Text size="sm">Left positioned popover</Text>
          </div>
        </Popover.Content>
      </Popover.Root>
    </div>
  );
};

export const FormExample: PopoverStoryFn = () => {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");

  return (
    <div style={{ padding: "100px" }}>
      <Popover.Root>
        <Popover.Trigger>
          <Button variant="primary">Add Contact</Button>
        </Popover.Trigger>
        <Popover.Content style={{ width: "300px" }}>
          <div style={{ padding: "var(--sp-lg)" }}>
            <Heading size="xs" style={{ marginBottom: "var(--sp-md)" }}>
              Add New Contact
            </Heading>
            <div style={{ marginBottom: "var(--sp-md)" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "var(--sp-xs)",
                  fontSize: "var(--font-body-sm)",
                }}
              >
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "var(--sp-sm)",
                  border: "var(--width-px) solid var(--border-tertiary)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "var(--font-body-md)",
                }}
              />
            </div>
            <div style={{ marginBottom: "var(--sp-lg)" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "var(--sp-xs)",
                  fontSize: "var(--font-body-sm)",
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "var(--sp-sm)",
                  border: "var(--width-px) solid var(--border-tertiary)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "var(--font-body-md)",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                gap: "var(--sp-sm)",
                justifyContent: "flex-end",
              }}
            >
              <Popover.Close asChild>
                <Button variant="secondary" size="sm">
                  Cancel
                </Button>
              </Popover.Close>
              <Popover.Close asChild>
                <Button variant="primary" size="sm">
                  Save
                </Button>
              </Popover.Close>
            </div>
          </div>
        </Popover.Content>
      </Popover.Root>
    </div>
  );
};

export default meta;
