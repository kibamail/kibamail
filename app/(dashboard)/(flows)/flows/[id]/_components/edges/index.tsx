import type { EdgeTypes } from "@xyflow/react";
import { CustomEdge } from "./custom-edge";
import {
  IfElseTrueEdge,
  IfElseFalseEdge,
  PercentageSplitAEdge,
  PercentageSplitBEdge,
} from "./conditional-edges";

export const edgeTypes: EdgeTypes = {
  default: CustomEdge,
  "custom-edge": CustomEdge,
  "if-else-true-edge": IfElseTrueEdge,
  "if-else-false-edge": IfElseFalseEdge,
  "percentage-split-a-edge": PercentageSplitAEdge,
  "percentage-split-b-edge": PercentageSplitBEdge,
};

export { CustomEdge };
