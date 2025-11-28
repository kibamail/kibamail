import type { Meta, StoryFn } from "@storybook/react";
import * as React from "react";
import * as NavigationMenu from "./navigation-menu";
import { Heading } from "../heading/heading";
import { Text } from "../text/text";

import "./navigation-menu.css";
import "../heading/heading.css";
import "../text/text.css";

const meta: Meta<typeof NavigationMenu.Root> = {
  title: "Components/NavigationMenu",
  component: NavigationMenu.Root,
};

export default meta;

type NavigationMenuStoryFn = StoryFn<typeof NavigationMenu.Root>;

// Helper component for list items
const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a"> & { title: string }
>(({ className, children, title, ...props }, forwardedRef) => (
  <li>
    <NavigationMenu.Link asChild>
      <a
        className={`kb-navigation-menu-list-item ${className || ""}`}
        {...props}
        ref={forwardedRef}
        style={{
          display: "block",
          outline: "none",
          textDecoration: "none",
          userSelect: "none",
          padding: "12px",
          borderRadius: "6px",
          fontSize: "15px",
          lineHeight: "1",
        }}
      >
        <div style={{ fontWeight: 500, lineHeight: 1.2, marginBottom: "5px", color: "var(--content-primary)" }}>
          {title}
        </div>
        <p style={{ color: "var(--content-secondary)", lineHeight: 1.4, fontWeight: "initial", margin: 0 }}>
          {children}
        </p>
      </a>
    </NavigationMenu.Link>
  </li>
));

export const Default: NavigationMenuStoryFn = () => {
  return (
    <div className="box">
      <h5>Navigation Menu</h5>
      <p style={{ fontSize: "14px", color: "#666", marginBottom: "16px" }}>
        A navigation menu component with dropdown support.
      </p>

      <NavigationMenu.Root>
        <NavigationMenu.List>
          <NavigationMenu.Item>
            <NavigationMenu.Trigger>
              Learn
            </NavigationMenu.Trigger>
            <NavigationMenu.Content>
              <ul style={{
                display: "grid",
                padding: "22px",
                margin: 0,
                columnGap: "10px",
                listStyle: "none",
                width: "500px",
                gridTemplateColumns: "0.75fr 1fr"
              }}>
                <li style={{ gridRow: "span 3" }}>
                  <NavigationMenu.Link asChild>
                    <a
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        flexDirection: "column",
                        width: "100%",
                        height: "100%",
                        background: "linear-gradient(135deg, var(--brown-500) 0%, var(--brown-700) 100%)",
                        borderRadius: "6px",
                        padding: "25px",
                        textDecoration: "none",
                        outline: "none",
                        userSelect: "none",
                        color: "white"
                      }}
                      href="/"
                    >
                      <svg
                        aria-hidden
                        width="38"
                        height="38"
                        viewBox="0 0 25 25"
                        fill="white"
                      >
                        <path d="M12 25C7.58173 25 4 21.4183 4 17C4 12.5817 7.58173 9 12 9V25Z"></path>
                        <path d="M12 0H4V8H12V0Z"></path>
                        <path d="M17 8C19.2091 8 21 6.20914 21 4C21 1.79086 19.2091 0 17 0C14.7909 0 13 1.79086 13 4C13 6.20914 14.7909 8 17 8Z"></path>
                      </svg>
                      <div style={{ fontSize: "18px", fontWeight: 500, lineHeight: 1.2, marginTop: "16px", marginBottom: "7px" }}>
                        Owly Design System
                      </div>
                      <p style={{ fontSize: "14px", lineHeight: 1.3, margin: 0, opacity: 0.8 }}>
                        Beautiful, accessible components for React.
                      </p>
                    </a>
                  </NavigationMenu.Link>
                </li>

                <ListItem href="/docs/primitives/overview/introduction" title="Introduction">
                  Build high-quality, accessible design systems and web apps.
                </ListItem>
                <ListItem href="/docs/primitives/overview/getting-started" title="Getting started">
                  A quick tutorial to get you up and running with Owly.
                </ListItem>
                <ListItem href="/docs/primitives/guides/styling" title="Styling">
                  Unstyled and compatible with any styling solution.
                </ListItem>
              </ul>
            </NavigationMenu.Content>
          </NavigationMenu.Item>

          <NavigationMenu.Item>
            <NavigationMenu.Trigger>
              Overview
            </NavigationMenu.Trigger>
            <NavigationMenu.Content>
              <ul style={{
                display: "grid",
                padding: "22px",
                margin: 0,
                columnGap: "10px",
                listStyle: "none",
                width: "600px",
                gridAutoFlow: "column",
                gridTemplateRows: "repeat(3, 1fr)"
              }}>
                <ListItem title="Components" href="/components">
                  Reusable UI components built with Radix primitives.
                </ListItem>
                <ListItem title="Design Tokens" href="/tokens">
                  Consistent design tokens for colors, spacing, and typography.
                </ListItem>
                <ListItem title="Accessibility" href="/accessibility">
                  Tested in a range of browsers and assistive technologies.
                </ListItem>
                <ListItem title="Theming" href="/theming">
                  Customize the design system to match your brand.
                </ListItem>
                <ListItem title="Examples" href="/examples">
                  Real-world examples and implementation patterns.
                </ListItem>
                <ListItem title="Releases" href="/releases">
                  Owly releases and their changelogs.
                </ListItem>
              </ul>
            </NavigationMenu.Content>
          </NavigationMenu.Item>

          <NavigationMenu.Item>
            <NavigationMenu.Link href="https://github.com/kibamail/owly">
              Github
            </NavigationMenu.Link>
          </NavigationMenu.Item>

          <NavigationMenu.Indicator />
        </NavigationMenu.List>

        <NavigationMenu.Viewport />
      </NavigationMenu.Root>
    </div>
  );
};

export const Simple: NavigationMenuStoryFn = () => {
  return (
    <div className="box">
      <h5>Simple Navigation Menu</h5>
      <p style={{ fontSize: "14px", color: "#666", marginBottom: "16px" }}>
        A simple navigation menu with just links.
      </p>

      <NavigationMenu.Root>
        <NavigationMenu.List>
          <NavigationMenu.Item>
            <NavigationMenu.Link href="/home">
              Home
            </NavigationMenu.Link>
          </NavigationMenu.Item>

          <NavigationMenu.Item>
            <NavigationMenu.Link href="/about">
              About
            </NavigationMenu.Link>
          </NavigationMenu.Item>

          <NavigationMenu.Item>
            <NavigationMenu.Link href="/services">
              Services
            </NavigationMenu.Link>
          </NavigationMenu.Item>

          <NavigationMenu.Item>
            <NavigationMenu.Link href="/contact">
              Contact
            </NavigationMenu.Link>
          </NavigationMenu.Item>
        </NavigationMenu.List>
      </NavigationMenu.Root>
    </div>
  );
};
