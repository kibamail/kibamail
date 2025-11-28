const postcss = require("postcss");

const breakpoints = [
  { name: "sm", value: 640 },
  { name: "md", value: 768 },
  { name: "lg", value: 1024 },
  { name: "xl", value: 1280 },
  { name: "2xl", value: 1536 },
].map((bp) => ({
  name: bp.name,
  params: `(min-width: ${bp.value}px)`,
}));

const cache = new WeakMap();

module.exports = () => ({
  postcssPlugin: "postcss-breakpoints",
  Rule(rule) {
    if (rule.parent.name === "breakpoints") {
      const breakpointsRule = rule.parent;

      if (!cache.has(breakpointsRule)) {
        const medias = breakpoints.reduce((breakpointsMedias, breakpoint) => {
          breakpointsMedias[breakpoint.name] = new postcss.AtRule({
            name: "media",
            params: breakpoint.params,
          });
          return breakpointsMedias;
        }, {});

        cache.set(breakpointsRule, medias);

        const mediaRules = Object.values(medias).reverse();
        mediaRules.forEach((media) => {
          breakpointsRule.after(media);
        });
      }

      breakpointsRule.before(rule);

      const originalRule = rule.clone();
      rule.selector = rule.selector.replace(/\n\s\s/g, "\n");
      rule.cleanRaws();

      breakpoints.forEach((breakpoint) => {
        const clone = originalRule.clone();
        addBreakpointPrefix(clone, breakpoint.name);
        cache.get(breakpointsRule)[breakpoint.name].append(clone);
      });

      if (breakpointsRule.nodes.length === 0) {
        breakpointsRule.remove();
        cache.delete(breakpointsRule);
      }
    }
  },
});

module.exports.postcss = true;

function addBreakpointPrefix(node, prefix) {
  if (node.type === "atrule") {
    node.each((child) => addBreakpointPrefix(child, prefix));
    return;
  }

  const classNameRegexp = /\.(kb-r-[a-z0-9-]+)/g;

  const escapedPrefix = prefix === "2xl" ? "\\32xl" : prefix;

  if (classNameRegexp.test(node.selector)) {
    node.selector = node.selector.replace(
      classNameRegexp,
      `.${escapedPrefix}\\:$1`,
    );
  }
}
