import type { Meta, StoryFn } from "@storybook/react";
import * as React from "react";
import * as HoverCard from "./hover-card";
import { Heading } from "../heading/heading";
import { Text } from "../text/text";
import { Button } from "../button/button";

import "./hover-card.css";
import "../heading/heading.css";
import "../text/text.css";
import "../button/button.css";

const meta: Meta<typeof HoverCard> = {
  title: "Components/HoverCard",
};

type HoverCardStoryFn = StoryFn<typeof HoverCard>;

export const Default: HoverCardStoryFn = () => {
  return (
    <div style={{ padding: "100px" }}>
      <HoverCard.Root>
        <HoverCard.Trigger>
          <Button variant="secondary">Hover over me</Button>
        </HoverCard.Trigger>

        <HoverCard.Portal>
          <HoverCard.Content align="start">
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <Heading as="h4" size="xs">Hover Card</Heading>
              <Text as="p" size="sm">
                This is a simple hover card component that appears when you hover over the trigger.
              </Text>
            </div>
          </HoverCard.Content>
        </HoverCard.Portal>
      </HoverCard.Root>
    </div>
  );
};

export const WithArrow: HoverCardStoryFn = () => {
  return (
    <div style={{ padding: "100px" }}>
      <HoverCard.Root>
        <HoverCard.Trigger>
          <Button variant="secondary">Hover for details</Button>
        </HoverCard.Trigger>

        <HoverCard.Portal>
          <HoverCard.Content align="start">
            <HoverCard.Arrow />
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <Heading as="h4" size="xs">With Arrow</Heading>
              <Text as="p" size="sm">
                This hover card has an arrow pointing to the trigger element.
              </Text>
            </div>
          </HoverCard.Content>
        </HoverCard.Portal>
      </HoverCard.Root>
    </div>
  );
};

export const UserProfile: HoverCardStoryFn = () => {
  return (
    <div style={{ padding: "100px" }}>
      <Text as="p" size="md">
        Hover over{" "}
        <HoverCard.Root>
          <HoverCard.Trigger>
            <span style={{ color: "var(--content-brand)", textDecoration: "underline", cursor: "pointer" }}>
              @johnsmith
            </span>
          </HoverCard.Trigger>

          <HoverCard.Portal>
            <HoverCard.Content align="start" side="top">
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "var(--radius-full)",
                      background: "var(--background-secondary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
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
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <Heading as="h5" size="xs">John Smith</Heading>
                    <Text as="p" size="sm">
                      @johnsmith
                    </Text>
                  </div>
                </div>
                <Text as="p" size="sm">
                  Senior Product Designer at Acme Inc. Passionate about creating delightful user experiences.
                </Text>
                <div style={{ display: "flex", gap: "16px" }}>
                  <Text as="span" size="sm">
                    <strong>1.2k</strong> Followers
                  </Text>
                  <Text as="span" size="sm">
                    <strong>284</strong> Following
                  </Text>
                </div>
              </div>
            </HoverCard.Content>
          </HoverCard.Portal>
        </HoverCard.Root>
        {" "}to see their profile
      </Text>
    </div>
  );
};

export const Alignment: HoverCardStoryFn = () => {
  return (
    <div style={{ padding: "100px", display: "flex", gap: "20px", flexWrap: "wrap" }}>
      <div>
        <p style={{ marginBottom: "8px", fontSize: "12px", color: "#666" }}>align="start"</p>
        <HoverCard.Root>
          <HoverCard.Trigger>
            <Button variant="secondary">Align Start</Button>
          </HoverCard.Trigger>
          <HoverCard.Portal>
            <HoverCard.Content align="start">
              <Heading as="h5" size="xs">Aligned to start</Heading>
            </HoverCard.Content>
          </HoverCard.Portal>
        </HoverCard.Root>
      </div>

      <div>
        <p style={{ marginBottom: "8px", fontSize: "12px", color: "#666" }}>align="center" (default)</p>
        <HoverCard.Root>
          <HoverCard.Trigger>
            <Button variant="secondary">Align Center</Button>
          </HoverCard.Trigger>
          <HoverCard.Portal>
            <HoverCard.Content align="center">
              <Heading as="h5" size="xs">Centered</Heading>
            </HoverCard.Content>
          </HoverCard.Portal>
        </HoverCard.Root>
      </div>

      <div>
        <p style={{ marginBottom: "8px", fontSize: "12px", color: "#666" }}>align="end"</p>
        <HoverCard.Root>
          <HoverCard.Trigger>
            <Button variant="secondary">Align End</Button>
          </HoverCard.Trigger>
          <HoverCard.Portal>
            <HoverCard.Content align="end">
              <Heading as="h5" size="xs">Aligned to end</Heading>
            </HoverCard.Content>
          </HoverCard.Portal>
        </HoverCard.Root>
      </div>
    </div>
  );
};

export const Sides: HoverCardStoryFn = () => {
  return (
    <div style={{ padding: "200px", display: "flex", gap: "40px", justifyContent: "center" }}>
      <HoverCard.Root>
        <HoverCard.Trigger>
          <Button variant="secondary">side="top"</Button>
        </HoverCard.Trigger>
        <HoverCard.Portal>
          <HoverCard.Content side="top" align="start">
            <Heading as="h5" size="xs">Top</Heading>
          </HoverCard.Content>
        </HoverCard.Portal>
      </HoverCard.Root>

      <HoverCard.Root>
        <HoverCard.Trigger>
          <Button variant="secondary">side="right"</Button>
        </HoverCard.Trigger>
        <HoverCard.Portal>
          <HoverCard.Content side="right" align="start">
            <Heading as="h5" size="xs">Right</Heading>
          </HoverCard.Content>
        </HoverCard.Portal>
      </HoverCard.Root>

      <HoverCard.Root>
        <HoverCard.Trigger>
          <Button variant="secondary">side="bottom"</Button>
        </HoverCard.Trigger>
        <HoverCard.Portal>
          <HoverCard.Content side="bottom" align="start">
            <Heading as="h5" size="xs">Bottom</Heading>
          </HoverCard.Content>
        </HoverCard.Portal>
      </HoverCard.Root>

      <HoverCard.Root>
        <HoverCard.Trigger>
          <Button variant="secondary">side="left"</Button>
        </HoverCard.Trigger>
        <HoverCard.Portal>
          <HoverCard.Content side="left" align="start">
            <Heading as="h5" size="xs">Left</Heading>
          </HoverCard.Content>
        </HoverCard.Portal>
      </HoverCard.Root>
    </div>
  );
};

export default meta;
