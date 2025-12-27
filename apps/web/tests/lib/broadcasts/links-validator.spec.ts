import { describe, expect, test } from "vitest";
import {
  extractLinksFromContent,
  validateLinks,
  validateContentLinks,
  VALID_LINK_VARIABLES,
} from "@/lib/broadcasts/links-validator";

describe("links-validator", () => {
  describe("extractLinksFromContent", () => {
    test("should extract href from button nodes", () => {
      const content = {
        type: "doc",
        content: [
          {
            type: "button",
            attrs: { href: "https://example.com" },
            content: [{ type: "text", text: "Click me" }],
          },
        ],
      };

      const links = extractLinksFromContent(content);

      expect(links).toEqual(["https://example.com"]);
    });

    test("should extract href from link marks on text nodes", () => {
      const content = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Click here",
                marks: [
                  {
                    type: "link",
                    attrs: { href: "https://link.example.com" },
                  },
                ],
              },
            ],
          },
        ],
      };

      const links = extractLinksFromContent(content);

      expect(links).toEqual(["https://link.example.com"]);
    });

    test("should extract multiple links from different sources", () => {
      const content = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Link 1",
                marks: [
                  { type: "link", attrs: { href: "{{unsubscribe_url}}" } },
                ],
              },
            ],
          },
          {
            type: "button",
            attrs: { href: "https://example.com" },
            content: [{ type: "text", text: "Button" }],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Link 2",
                marks: [
                  { type: "link", attrs: { href: "{{preferences_url}}" } },
                ],
              },
            ],
          },
        ],
      };

      const links = extractLinksFromContent(content);

      expect(links).toHaveLength(3);
      expect(links).toContain("{{unsubscribe_url}}");
      expect(links).toContain("https://example.com");
      expect(links).toContain("{{preferences_url}}");
    });

    test("should extract links from deeply nested content", () => {
      const content = {
        type: "doc",
        content: [
          {
            type: "panel",
            content: [
              {
                type: "bulletList",
                content: [
                  {
                    type: "listItem",
                    content: [
                      {
                        type: "paragraph",
                        content: [
                          {
                            type: "text",
                            text: "Deep link",
                            marks: [
                              {
                                type: "link",
                                attrs: { href: "https://deep.example.com" },
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const links = extractLinksFromContent(content);

      expect(links).toEqual(["https://deep.example.com"]);
    });

    test("should return empty array when no links present", () => {
      const content = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "No links here" }],
          },
        ],
      };

      const links = extractLinksFromContent(content);

      expect(links).toEqual([]);
    });

    test("should deduplicate links", () => {
      const content = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Link 1",
                marks: [
                  { type: "link", attrs: { href: "https://example.com" } },
                ],
              },
            ],
          },
          {
            type: "button",
            attrs: { href: "https://example.com" },
            content: [{ type: "text", text: "Same link" }],
          },
        ],
      };

      const links = extractLinksFromContent(content);

      expect(links).toEqual(["https://example.com"]);
    });

    test("should ignore empty href values", () => {
      const content = {
        type: "doc",
        content: [
          {
            type: "button",
            attrs: { href: "" },
            content: [{ type: "text", text: "Empty href" }],
          },
          {
            type: "button",
            attrs: { href: "   " },
            content: [{ type: "text", text: "Whitespace href" }],
          },
        ],
      };

      const links = extractLinksFromContent(content);

      expect(links).toEqual([]);
    });

    test("should handle null and undefined content", () => {
      expect(extractLinksFromContent(null)).toEqual([]);
      expect(extractLinksFromContent(undefined)).toEqual([]);
      expect(extractLinksFromContent({})).toEqual([]);
    });
  });

  describe("validateLinks", () => {
    test("should validate known variable links as valid", async () => {
      const result = await validateLinks([
        "{{unsubscribe_url}}",
        "{{preferences_url}}",
        "{{view_in_browser_url}}",
      ]);

      expect(result.allValid).toBe(true);
      expect(result.validCount).toBe(3);
      expect(result.invalidCount).toBe(0);

      for (const link of result.links) {
        expect(link.type).toBe("variable");
        expect(link.status).toBe("valid");
      }
    });

    test("should mark unknown variable links as invalid", async () => {
      const result = await validateLinks(["{{unknown_variable}}"]);

      expect(result.allValid).toBe(false);
      expect(result.invalidCount).toBe(1);

      const link = result.links[0];
      expect(link.type).toBe("variable");
      expect(link.status).toBe("invalid");
      expect(link.reason).toContain("Unknown link variable");
    });

    test("should mark invalid URL format as invalid", async () => {
      const result = await validateLinks(["not-a-url", "javascript:alert(1)"]);

      expect(result.allValid).toBe(false);
      expect(result.invalidCount).toBe(2);

      for (const link of result.links) {
        expect(link.type).toBe("url");
        expect(link.status).toBe("invalid");
        expect(link.reason).toBe("Url seems to be not responsive. Please check again.");
      }
    });

    test("should return empty result for empty array", async () => {
      const result = await validateLinks([]);

      expect(result.allValid).toBe(true);
      expect(result.links).toHaveLength(0);
      expect(result.validCount).toBe(0);
      expect(result.invalidCount).toBe(0);
    });

    test("should handle mixed valid and invalid links", async () => {
      const result = await validateLinks([
        "{{unsubscribe_url}}",
        "{{bad_variable}}",
        "https://example.com",
        "invalid-url",
      ]);

      // Variable links: 1 valid, 1 invalid
      // URL links: example.com should be valid, invalid-url should be invalid
      expect(result.links).toHaveLength(4);

      const validLinks = result.links.filter((l) => l.status === "valid");
      const invalidLinks = result.links.filter((l) => l.status === "invalid");

      expect(validLinks.length).toBeGreaterThanOrEqual(1);
      expect(invalidLinks.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("validateContentLinks", () => {
    test("should extract and validate links from content JSON", async () => {
      const content = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Unsubscribe",
                marks: [
                  { type: "link", attrs: { href: "{{unsubscribe_url}}" } },
                ],
              },
            ],
          },
        ],
      };

      const result = await validateContentLinks(content);

      expect(result.links).toHaveLength(1);
      expect(result.allValid).toBe(true);
      expect(result.links[0].url).toBe("{{unsubscribe_url}}");
      expect(result.links[0].status).toBe("valid");
    });

    test("should return valid for content with no links", async () => {
      const content = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "No links" }],
          },
        ],
      };

      const result = await validateContentLinks(content);

      expect(result.allValid).toBe(true);
      expect(result.links).toHaveLength(0);
    });
  });

  describe("VALID_LINK_VARIABLES", () => {
    test("should include all expected link variables", () => {
      expect(VALID_LINK_VARIABLES).toContain("unsubscribe_url");
      expect(VALID_LINK_VARIABLES).toContain("preferences_url");
      expect(VALID_LINK_VARIABLES).toContain("view_in_browser_url");
    });
  });
});
