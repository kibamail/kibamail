import type { Meta, StoryFn } from "@storybook/react";
import * as React from "react";
import * as SettingsCard from "./settings-card";
import { Heading } from "../heading/heading";
import { Text } from "../text/text";
import { Button } from "../button/button";
import * as TextField from "../text-field/text-field";
import { Checkbox } from "../checkbox/checkbox";

import "./settings-card.css";
import "../heading/heading.css";
import "../text/text.css";
import "../button/button.css";
import "../text-field/text-field.css";
import "../checkbox/checkbox.css";
import "../input-label/input-label.css";

const meta: Meta<typeof SettingsCard> = {
  title: "Components/SettingsCard",
};

type SettingsCardStoryFn = StoryFn<typeof SettingsCard>;

export const Default: SettingsCardStoryFn = () => {
  return (
    <SettingsCard.Root>
      <SettingsCard.Header>
        <div>
          <Heading as="h3" size="xs" variant="heading">
            General Settings
          </Heading>
          <Text as="p" size="sm">
            Manage your account settings and preferences
          </Text>
        </div>
      </SettingsCard.Header>
      <SettingsCard.Content>
        <TextField.Root defaultValue="John Doe" type="text">
          <TextField.Label>Display Name</TextField.Label>
        </TextField.Root>
        <TextField.Root defaultValue="john@example.com" type="email">
          <TextField.Label>Email Address</TextField.Label>
        </TextField.Root>
      </SettingsCard.Content>
      <SettingsCard.Footer>
        <SettingsCard.Actions>
          <Button variant="secondary">Cancel</Button>
          <Button variant="primary">Save Changes</Button>
        </SettingsCard.Actions>
      </SettingsCard.Footer>
    </SettingsCard.Root>
  );
};

export const WithoutFooter: SettingsCardStoryFn = () => {
  return (
    <SettingsCard.Root>
      <SettingsCard.Header>
        <Heading as="h3" size="xs" variant="heading">
          Notification Preferences
        </Heading>
      </SettingsCard.Header>
      <SettingsCard.Content>
        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Checkbox defaultChecked />
          <Text size="sm">Email notifications</Text>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Checkbox defaultChecked />
          <Text size="sm">Push notifications</Text>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Checkbox />
          <Text size="sm">SMS notifications</Text>
        </label>
      </SettingsCard.Content>
    </SettingsCard.Root>
  );
};

export const WithoutHeader: SettingsCardStoryFn = () => {
  return (
    <SettingsCard.Root>
      <SettingsCard.Content>
        <Text as="p" size="sm">
          This is a simple settings card without a header. You can use just the
          content section when you don't need a title or description.
        </Text>
      </SettingsCard.Content>
      <SettingsCard.Footer>
        <SettingsCard.Actions>
          <Button variant="primary">Confirm</Button>
        </SettingsCard.Actions>
      </SettingsCard.Footer>
    </SettingsCard.Root>
  );
};

export const ContentOnly: SettingsCardStoryFn = () => {
  return (
    <SettingsCard.Root>
      <SettingsCard.Content>
        <Heading as="h4" size="xs" variant="heading">
          API Keys
        </Heading>
        <Text as="p" size="sm" style={{ marginTop: "8px", marginBottom: "16px" }}>
          Manage your API keys and access tokens
        </Text>
        <div
          style={{
            padding: "12px",
            background: "var(--background-secondary)",
            borderRadius: "var(--radius-md)",
            fontFamily: "monospace",
            fontSize: "12px",
          }}
        >
          sk_live_1234567890abcdefghijklmnop
        </div>
      </SettingsCard.Content>
    </SettingsCard.Root>
  );
};

export const WithActionsInHeader: SettingsCardStoryFn = () => {
  return (
    <SettingsCard.Root>
      <SettingsCard.Header>
        <div>
          <Heading as="h3" size="xs" variant="heading">
            Security Settings
          </Heading>
          <Text as="p" size="sm">
            Manage your security preferences
          </Text>
        </div>
        <SettingsCard.Actions>
          <Button variant="secondary" size="sm">
            Reset
          </Button>
          <Button variant="primary" size="sm">
            Save
          </Button>
        </SettingsCard.Actions>
      </SettingsCard.Header>
      <SettingsCard.Content>
        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Checkbox defaultChecked />
          <Text size="sm">Enable two-factor authentication</Text>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Checkbox />
          <Text size="sm">Require password on login</Text>
        </label>
      </SettingsCard.Content>
    </SettingsCard.Root>
  );
};

export const WithActionsInBothHeaderAndFooter: SettingsCardStoryFn = () => {
  return (
    <SettingsCard.Root>
      <SettingsCard.Header>
        <div>
          <Heading as="h3" size="xs" variant="heading">
            Profile Settings
          </Heading>
        </div>
        <SettingsCard.Actions>
          <Button variant="tertiary" size="sm">
            Preview
          </Button>
        </SettingsCard.Actions>
      </SettingsCard.Header>
      <SettingsCard.Content>
        <TextField.Root defaultValue="John Doe" type="text">
          <TextField.Label>Full Name</TextField.Label>
        </TextField.Root>
        <TextField.Root defaultValue="Software Engineer" type="text">
          <TextField.Label>Job Title</TextField.Label>
        </TextField.Root>
      </SettingsCard.Content>
      <SettingsCard.Footer>
        <Text size="sm">Changes will be saved immediately</Text>
        <SettingsCard.Actions>
          <Button variant="secondary">Cancel</Button>
          <Button variant="primary">Update Profile</Button>
        </SettingsCard.Actions>
      </SettingsCard.Footer>
    </SettingsCard.Root>
  );
};

export default meta;
