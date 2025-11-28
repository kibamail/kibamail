const postcss = require("postcss");

const breakpoints = {
  sm: "(min-width: 640px)",
  md: "(min-width: 768px)",
  lg: "(min-width: 1024px)",
  xl: "(min-width: 1280px)",
  "2xl": "(min-width: 1536px)",
};

module.exports = () => ({
  postcssPlugin: "postcss-screen-breakpoints",
  AtRule: {
    sm(atRule) {
      handleBreakpoint(atRule, "sm");
    },
    md(atRule) {
      handleBreakpoint(atRule, "md");
    },
    lg(atRule) {
      handleBreakpoint(atRule, "lg");
    },
    xl(atRule) {
      handleBreakpoint(atRule, "xl");
    },
    "2xl"(atRule) {
      handleBreakpoint(atRule, "2xl");
    },
  },
});

function handleBreakpoint(atRule, breakpointName) {
  // Create a @media rule with the breakpoint params
  const mediaRule = postcss.atRule({
    name: "media",
    params: breakpoints[breakpointName],
  });

  // Move all child rules from @sm/@md/etc into the @media rule
  atRule.each((child) => {
    mediaRule.append(child.clone());
  });

  // Replace the @sm/@md/etc directive with the @media rule
  atRule.replaceWith(mediaRule);
}

module.exports.postcss = true;
