export const responsiveBreakpoints = [
  "base",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
] as const;

export type ResponsiveBreakpoint = (typeof responsiveBreakpoints)[number];
