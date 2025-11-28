const path = require("path");

module.exports = {
  plugins: [
    require("postcss-import")({
      path: [path.relative(process.cwd(), "../")],
    }),
    require('./postcss/apply-rules.cjs'),
    require('./postcss/screen-breakpoints.cjs'),
    require("postcss-nesting"),
    require("postcss-combine-duplicated-selectors"),
    require("postcss-discard-empty"),
    require("./postcss/whitespace.cjs"),
    require("./postcss/breakpoints.cjs"),
    require("autoprefixer"),
  ],
};
