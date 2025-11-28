import React from "react";
import type { Meta, StoryFn } from "@storybook/react";

import { Text } from "./text";

const meta: Meta<typeof Text> = {
  title: "Components/Text",
  component: Text,
};

type TextStoryFn = StoryFn<typeof Text>;

export const Sizes: TextStoryFn = () => {
  return (
    <>
      <div className="box">
        <h5>Size - Extra Small</h5>

        <div>
          <Text size="xs">The quick brown fox jumps over the lazy dog</Text>
        </div>
      </div>
      <div className="box">
        <h5>Size - Small</h5>

        <div>
          <Text size="sm">The quick brown fox jumps over the lazy dog</Text>
        </div>
      </div>

      <div className="box">
        <h5>Size - Medium</h5>

        <div>
          <Text size="md">The quick brown fox jumps over the lazy dog</Text>
        </div>
      </div>

      <div className="box">
        <h5>Size - Large</h5>

        <div>
          <Text size="lg">The quick brown fox jumps over the lazy dog</Text>
        </div>
      </div>

      <div className="box">
        <h5>Size - Extra large</h5>

        <div>
          <Text size="xl">The quick brown fox jumps over the lazy dog</Text>
        </div>
      </div>
    </>
  );
};

export const Variants: TextStoryFn = () => {
  return (
    <>
      <div className="box">
        <h5>Variant - Primary</h5>

        <div>
          <Text variant="primary">The quick brown fox jumps over the lazy dog</Text>
        </div>
      </div>

      <div className="box">
        <h5>Variant - Secondary</h5>

        <div>
          <Text variant="secondary">The quick brown fox jumps over the lazy dog</Text>
        </div>
      </div>

      <div className="box">
        <h5>Variant - Tertiary</h5>

        <div>
          <Text variant="tertiary">The quick brown fox jumps over the lazy dog</Text>
        </div>
      </div>
    </>
  );
};

export const VariantsWithSizes: TextStoryFn = () => {
  return (
    <>
      <div className="box">
        <h5>Primary - Large</h5>

        <div>
          <Text variant="primary" size="lg">The quick brown fox jumps over the lazy dog</Text>
        </div>
      </div>

      <div className="box">
        <h5>Secondary - Medium</h5>

        <div>
          <Text variant="secondary" size="md">The quick brown fox jumps over the lazy dog</Text>
        </div>
      </div>

      <div className="box">
        <h5>Tertiary - Small</h5>

        <div>
          <Text variant="tertiary" size="sm">The quick brown fox jumps over the lazy dog</Text>
        </div>
      </div>
    </>
  );
};

export default meta;
