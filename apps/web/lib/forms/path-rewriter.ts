import * as cheerio from "cheerio";

/**
 * Check if a URL is absolute (should not be rewritten).
 */
function isAbsoluteUrl(url: string): boolean {
  return (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("//") ||
    url.startsWith("data:") ||
    url.startsWith("blob:") ||
    url.startsWith("#") ||
    url.startsWith("mailto:") ||
    url.startsWith("tel:")
  );
}

/**
 * Rewrite a relative URL to an absolute one.
 */
function rewriteUrl(url: string, baseUrl: string): string {
  if (!url || isAbsoluteUrl(url)) return url;
  // Strip leading ./ if present
  const cleaned = url.startsWith("./") ? url.slice(2) : url;
  return `${baseUrl}/${cleaned}`;
}

/**
 * Rewrite url() references in CSS text.
 */
function rewriteCssUrls(css: string, baseUrl: string): string {
  return css.replace(
    /url\(\s*['"]?([^'")]+)['"]?\s*\)/g,
    (_match, url: string) => {
      const rewritten = rewriteUrl(url.trim(), baseUrl);
      return `url('${rewritten}')`;
    },
  );
}

/**
 * Rewrite all relative paths in HTML to absolute S3 URLs.
 *
 * Handles:
 * - <link href>, <script src>, <img src>, <video src>, <source src>
 * - <style> blocks with url() references
 * - Inline style attributes with url() references
 *
 * Skips absolute URLs, data URIs, fragments, mailto, and tel links.
 */
export function rewriteRelativePaths(html: string, baseUrl: string): string {
  const $ = cheerio.load(html);

  // Rewrite src attributes
  $("[src]").each((_i, el) => {
    const $el = $(el);
    const src = $el.attr("src");
    if (src) {
      $el.attr("src", rewriteUrl(src, baseUrl));
    }
  });

  // Rewrite href attributes on <link> elements (stylesheets, icons)
  $("link[href]").each((_i, el) => {
    const $el = $(el);
    const href = $el.attr("href");
    if (href) {
      $el.attr("href", rewriteUrl(href, baseUrl));
    }
  });

  // Rewrite url() in <style> blocks
  $("style").each((_i, el) => {
    const $el = $(el);
    const css = $el.html();
    if (css) {
      $el.html(rewriteCssUrls(css, baseUrl));
    }
  });

  // Rewrite url() in inline style attributes
  $("[style]").each((_i, el) => {
    const $el = $(el);
    const style = $el.attr("style");
    if (style && style.includes("url(")) {
      $el.attr("style", rewriteCssUrls(style, baseUrl));
    }
  });

  return $.html();
}
