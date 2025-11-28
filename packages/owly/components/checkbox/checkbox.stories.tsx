import React from "react";
import type { Meta, StoryFn } from "@storybook/react";

import { Checkbox } from "./checkbox";

const meta = {
  title: "Components/Checkbox",
} satisfies Meta<typeof Checkbox>;

export default meta;

type ButtonStoryFn = StoryFn<typeof Checkbox>;

export const Variants: ButtonStoryFn = () => {
  return (
    <>
      <div className="box">
        <h5>Default - square</h5>
        <div>
          <Checkbox />
        </div>
      </div>

      <div className="box">
        <h5>Circle</h5>
        <div>
          <Checkbox variant="circle" />
        </div>
      </div>
    </>
  );
};

export const Sizes: ButtonStoryFn = () => {
  return (
    <>
      <div className="box">
        <h5>Medium - Default</h5>
        <div>
          <Checkbox size="md" />
        </div>
      </div>

      <div className="box">
        <h5>Medium - Circle</h5>
        <div>
          <Checkbox size="md" />
        </div>
      </div>

      <div className="box">
        <h5>Small - Default</h5>
        <div>
          <Checkbox size="sm" />
        </div>
      </div>

      <div className="box">
        <h5>Small - Circle</h5>
        <div>
          <Checkbox variant="circle" size="sm" />
        </div>
      </div>
    </>
  );
};

export const State: ButtonStoryFn = () => {
  return (
    <>
      <div className="box">
        <h5>Indeterminate - default</h5>
        <div>
          <Checkbox defaultChecked="indeterminate" />
        </div>
      </div>

      <div className="box">
        <h5>Indeterminate - circle</h5>
        <div>
          <Checkbox defaultChecked="indeterminate" variant="circle" />
        </div>
      </div>

      <div className="box">
        <h5>Checked - default</h5>
        <div>
          <Checkbox defaultChecked={true} />
        </div>
      </div>

      <div className="box">
        <h5>Checked - circle</h5>
        <div>
          <Checkbox variant="circle" defaultChecked={true} />
        </div>
      </div>

      <div className="box">
        <h5>Disabled - default</h5>
        <div>
          <Checkbox disabled defaultChecked={true} />
        </div>
      </div>

      <div className="box">
        <h5>Disabled - circle</h5>
        <div>
          <Checkbox variant="circle" disabled defaultChecked={true} />
        </div>
      </div>
    </>
  );
};
