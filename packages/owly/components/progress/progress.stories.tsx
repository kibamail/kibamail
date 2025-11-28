import React from "react";
import type { Meta, StoryFn } from "@storybook/react";
import { Progress } from "./progress";

const meta: Meta<typeof Progress> = {
  title: "Components/Progress",
  component: Progress,
};

type ProgressStoryFn = StoryFn<typeof Progress>;

export const Variants: ProgressStoryFn = () => {
  return (
    <>
      <div className="box">
        <h5>Variant - Success</h5>

        <div>
          <Progress value={37} variant="success" />
        </div>
      </div>

      <div className="box">
        <h5>Variant - Error</h5>

        <div>
          <Progress value={65} variant="error" />
        </div>
      </div>

      <div className="box">
        <h5>Variant - Warning</h5>

        <div>
          <Progress value={78} variant="warning" />
        </div>
      </div>

      <div className="box">
        <h5>Variant - Info</h5>

        <div>
          <Progress value={55} variant="info" />
        </div>
      </div>
    </>
  );
};

export const Sizes: ProgressStoryFn = () => {
  const [size, setSize] = React.useState(22);

  return (
    <>
      <div className="box">
        <h5>Slider (Control progress width)</h5>

        <div>
          <input
            type="range"
            min={0}
            max={100}
            style={{ width: "100%" }}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="box">
        <h5>Size - Large</h5>

        <div>
          <Progress value={size} variant="error" size="lg" />
        </div>
      </div>
      <div className="box">
        <h5>Size - Medium</h5>

        <div>
          <Progress value={size} variant="success" size="md" />
        </div>
      </div>

      <div className="box">
        <h5>Size - Small</h5>

        <div>
          <Progress value={size} variant="warning" size="sm" />
        </div>
      </div>
    </>
  );
};

export default meta;
