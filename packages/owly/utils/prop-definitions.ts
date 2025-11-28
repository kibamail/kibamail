import { type ResponsiveBreakpoint } from "./breakpoints";

export type ResponsiveProp<T> = T | Partial<Record<ResponsiveBreakpoint, T>>;
