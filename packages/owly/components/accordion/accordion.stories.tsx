import type { Meta, StoryFn } from "@storybook/react";
import * as React from "react";
import * as Accordion from "./accordion";
import { Text } from "../text/text";

import "./accordion.css";
import "../text/text.css";

const meta: Meta<typeof Accordion> = {
  title: "Components/Accordion",
};

type AccordionStoryFn = StoryFn<typeof Accordion>;

export const Default: AccordionStoryFn = () => {
  return (
    <Accordion.Root type="single" collapsible defaultValue="item-1">
      <Accordion.Item value="item-1">
        <Accordion.Trigger>Is it accessible?</Accordion.Trigger>
        <Accordion.Content>
          <Text as="p" size="sm">
            Yes. It adheres to the WAI-ARIA design pattern.
          </Text>
        </Accordion.Content>
      </Accordion.Item>

      <Accordion.Item value="item-2">
        <Accordion.Trigger>Is it unstyled?</Accordion.Trigger>
        <Accordion.Content>
          <Text as="p" size="sm">
            Yes. It's unstyled by default, giving you freedom over the look and
            feel.
          </Text>
        </Accordion.Content>
      </Accordion.Item>

      <Accordion.Item value="item-3">
        <Accordion.Trigger>Can it be animated?</Accordion.Trigger>
        <Accordion.Content>
          <Text as="p" size="sm">
            Yes! You can animate the Accordion with CSS or JavaScript.
          </Text>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  );
};

export const Variants: AccordionStoryFn = () => {
  return (
    <>
      <div className="box">
        <h5>Default</h5>
        <div>
          <Accordion.Root type="single" collapsible defaultValue="item-1">
            <Accordion.Item value="item-1">
              <Accordion.Trigger>What is your refund policy?</Accordion.Trigger>
              <Accordion.Content>
                <Text as="p" size="sm">
                  We offer a 30-day money-back guarantee for all purchases. If
                  you're not satisfied with your purchase, contact our support
                  team for a full refund.
                </Text>
              </Accordion.Content>
            </Accordion.Item>

            <Accordion.Item value="item-2">
              <Accordion.Trigger>Do you offer technical support?</Accordion.Trigger>
              <Accordion.Content>
                <Text as="p" size="sm">
                  Yes, we provide 24/7 technical support via email and live chat.
                  Premium customers also get access to priority phone support.
                </Text>
              </Accordion.Content>
            </Accordion.Item>

            <Accordion.Item value="item-3">
              <Accordion.Trigger>How do I upgrade my plan?</Accordion.Trigger>
              <Accordion.Content>
                <Text as="p" size="sm">
                  You can upgrade your plan at any time from your account settings.
                  Changes take effect immediately and you'll be billed
                  proportionally.
                </Text>
              </Accordion.Content>
            </Accordion.Item>
          </Accordion.Root>
        </div>
      </div>

      <div className="box">
        <h5>Bordered</h5>
        <div>
          <Accordion.Root
            type="single"
            collapsible
            defaultValue="item-1"
            variant="bordered"
          >
            <Accordion.Item value="item-1">
              <Accordion.Trigger>What is your refund policy?</Accordion.Trigger>
              <Accordion.Content>
                <Text as="p" size="sm">
                  We offer a 30-day money-back guarantee for all purchases. If
                  you're not satisfied with your purchase, contact our support
                  team for a full refund.
                </Text>
              </Accordion.Content>
            </Accordion.Item>

            <Accordion.Item value="item-2">
              <Accordion.Trigger>Do you offer technical support?</Accordion.Trigger>
              <Accordion.Content>
                <Text as="p" size="sm">
                  Yes, we provide 24/7 technical support via email and live chat.
                  Premium customers also get access to priority phone support.
                </Text>
              </Accordion.Content>
            </Accordion.Item>

            <Accordion.Item value="item-3">
              <Accordion.Trigger>How do I upgrade my plan?</Accordion.Trigger>
              <Accordion.Content>
                <Text as="p" size="sm">
                  You can upgrade your plan at any time from your account settings.
                  Changes take effect immediately and you'll be billed
                  proportionally.
                </Text>
              </Accordion.Content>
            </Accordion.Item>
          </Accordion.Root>
        </div>
      </div>
    </>
  );
};

export const Sizes: AccordionStoryFn = () => {
  return (
    <>
      <div className="box">
        <h5>Small</h5>
        <div>
          <Accordion.Root
            type="single"
            collapsible
            defaultValue="item-1"
            size="sm"
          >
            <Accordion.Item value="item-1">
              <Accordion.Trigger>Small accordion item</Accordion.Trigger>
              <Accordion.Content>
                <Text as="p" size="sm">
                  This is a small accordion with reduced padding and font size.
                </Text>
              </Accordion.Content>
            </Accordion.Item>

            <Accordion.Item value="item-2">
              <Accordion.Trigger>Another small item</Accordion.Trigger>
              <Accordion.Content>
                <Text as="p" size="sm">
                  Perfect for compact layouts or sidebars.
                </Text>
              </Accordion.Content>
            </Accordion.Item>
          </Accordion.Root>
        </div>
      </div>

      <div className="box">
        <h5>Medium (Default)</h5>
        <div>
          <Accordion.Root
            type="single"
            collapsible
            defaultValue="item-1"
            size="md"
          >
            <Accordion.Item value="item-1">
              <Accordion.Trigger>Medium accordion item</Accordion.Trigger>
              <Accordion.Content>
                <Text as="p" size="sm">
                  This is the default medium size, suitable for most use cases.
                </Text>
              </Accordion.Content>
            </Accordion.Item>

            <Accordion.Item value="item-2">
              <Accordion.Trigger>Another medium item</Accordion.Trigger>
              <Accordion.Content>
                <Text as="p" size="sm">
                  Balanced spacing and readability.
                </Text>
              </Accordion.Content>
            </Accordion.Item>
          </Accordion.Root>
        </div>
      </div>

      <div className="box">
        <h5>Large</h5>
        <div>
          <Accordion.Root
            type="single"
            collapsible
            defaultValue="item-1"
            size="lg"
          >
            <Accordion.Item value="item-1">
              <Accordion.Trigger>Large accordion item</Accordion.Trigger>
              <Accordion.Content>
                <Text as="p" size="md">
                  This is a large accordion with increased padding and font size.
                </Text>
              </Accordion.Content>
            </Accordion.Item>

            <Accordion.Item value="item-2">
              <Accordion.Trigger>Another large item</Accordion.Trigger>
              <Accordion.Content>
                <Text as="p" size="md">
                  Great for prominent sections or when you need more breathing
                  room.
                </Text>
              </Accordion.Content>
            </Accordion.Item>
          </Accordion.Root>
        </div>
      </div>
    </>
  );
};

export const Multiple: AccordionStoryFn = () => {
  return (
    <div className="box">
      <h5>Multiple items open at once</h5>
      <div>
        <Accordion.Root
          type="multiple"
          defaultValue={["item-1", "item-2"]}
          variant="bordered"
        >
          <Accordion.Item value="item-1">
            <Accordion.Trigger>Features</Accordion.Trigger>
            <Accordion.Content>
              <Text as="p" size="sm">
                Our platform includes real-time analytics, automated workflows,
                and seamless integrations with your favorite tools.
              </Text>
            </Accordion.Content>
          </Accordion.Item>

          <Accordion.Item value="item-2">
            <Accordion.Trigger>Pricing</Accordion.Trigger>
            <Accordion.Content>
              <Text as="p" size="sm">
                We offer flexible pricing plans starting at $9/month for
                individuals, $29/month for teams, and custom enterprise pricing.
              </Text>
            </Accordion.Content>
          </Accordion.Item>

          <Accordion.Item value="item-3">
            <Accordion.Trigger>Getting Started</Accordion.Trigger>
            <Accordion.Content>
              <Text as="p" size="sm">
                Sign up for a free trial, no credit card required. Our onboarding
                wizard will guide you through the initial setup in just a few
                minutes.
              </Text>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion.Root>
      </div>
    </div>
  );
};

export const WithRichContent: AccordionStoryFn = () => {
  return (
    <div className="box">
      <h5>Accordion with rich content</h5>
      <div>
        <Accordion.Root type="single" collapsible variant="bordered">
          <Accordion.Item value="item-1">
            <Accordion.Trigger>System Requirements</Accordion.Trigger>
            <Accordion.Content>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <Text as="p" size="sm" style={{ fontWeight: 600, marginBottom: "4px" }}>
                    Operating System:
                  </Text>
                  <Text as="p" size="sm">
                    Windows 10 or later, macOS 10.15 or later, Linux (Ubuntu 20.04+)
                  </Text>
                </div>
                <div>
                  <Text as="p" size="sm" style={{ fontWeight: 600, marginBottom: "4px" }}>
                    Memory:
                  </Text>
                  <Text as="p" size="sm">
                    Minimum 4GB RAM, 8GB recommended
                  </Text>
                </div>
                <div>
                  <Text as="p" size="sm" style={{ fontWeight: 600, marginBottom: "4px" }}>
                    Storage:
                  </Text>
                  <Text as="p" size="sm">
                    At least 500MB of available disk space
                  </Text>
                </div>
              </div>
            </Accordion.Content>
          </Accordion.Item>

          <Accordion.Item value="item-2">
            <Accordion.Trigger>Installation Steps</Accordion.Trigger>
            <Accordion.Content>
              <ol style={{ margin: 0, paddingLeft: "20px" }}>
                <li style={{ marginBottom: "8px" }}>
                  <Text as="span" size="sm">
                    Download the installer from our website
                  </Text>
                </li>
                <li style={{ marginBottom: "8px" }}>
                  <Text as="span" size="sm">
                    Run the installer and follow the on-screen instructions
                  </Text>
                </li>
                <li style={{ marginBottom: "8px" }}>
                  <Text as="span" size="sm">
                    Launch the application and complete the setup wizard
                  </Text>
                </li>
                <li>
                  <Text as="span" size="sm">
                    Sign in with your account credentials
                  </Text>
                </li>
              </ol>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion.Root>
      </div>
    </div>
  );
};

export default meta;
