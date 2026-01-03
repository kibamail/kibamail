import type { EdgeTypes } from "@xyflow/react";
import {
  IfElseFalseEdge,
  IfElseTrueEdge,
  PercentageSplitAEdge,
  PercentageSplitBEdge,
} from "./conditional-edges";
import { CustomEdge } from "./custom-edge";

export const edgeTypes: EdgeTypes = {
  default: CustomEdge,
  "custom-edge": CustomEdge,
  "if-else-true-edge": IfElseTrueEdge,
  "if-else-false-edge": IfElseFalseEdge,
  "percentage-split-a-edge": PercentageSplitAEdge,
  "percentage-split-b-edge": PercentageSplitBEdge,
};
