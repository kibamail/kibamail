import React from "react";
import {
  AtSignCircle,
  CheckCircle,
  CheckSquare,
  Eye,
  InfoCircle,
  WarningCircle,
} from "iconoir-react";
import type { Meta, StoryFn, StoryObj } from "@storybook/react";

import { Badge } from "./badge";

const meta: Meta<typeof Badge> = {
  title: "Components/Badge",
  component: Badge,
};

type Story = StoryObj<typeof Badge>;
type BadgeStoryFn = StoryFn<typeof Badge>;

export const Variants: BadgeStoryFn = () => {
  return (
    <>
      <div className="box">
        <h5>Variant - Info</h5>

        <div>
          <Badge variant="info">
            <Eye />
            Under review
          </Badge>
        </div>
      </div>

      <div className="box">
        <h5>Variant - Success</h5>

        <div>
          <Badge variant="success">
            <CheckCircle />
            Paid
          </Badge>
        </div>
      </div>

      <div className="box">
        <h5>Variant - Warning</h5>

        <div>
          <Badge variant="warning">
            <AtSignCircle />
            Email credits expired
          </Badge>
        </div>
      </div>

      <div className="box">
        <h5>Variant - Neutral</h5>

        <div>
          <Badge variant="neutral">
            <InfoCircle />
            Arrived 93 days ago
          </Badge>
        </div>
      </div>
    </>
  );
};

export const Sizes: BadgeStoryFn = () => {
  return (
    <>
      <div className="box">
        <h5>Size - Small</h5>

        <div>
          <Badge size="sm" variant="warning">
            <CheckCircle />
            Awaiting payment
          </Badge>
        </div>
      </div>

      <div className="box">
        <h5>Size - Medium</h5>

        <div>
          <Badge size="md" variant="info">
            <CheckSquare />
            Finished processing
          </Badge>
        </div>
      </div>
    </>
  );
};

export default meta;
