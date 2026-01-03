export const VALID_LINK_VARIABLES = [
  "unsubscribe_url",
  "preferences_url",
  "view_in_browser_url",
] as const;

export type ValidLinkVariable = (typeof VALID_LINK_VARIABLES)[number];

export type LinkStatus = "valid" | "invalid" | "pending";

export interface ExtractedLink {
  url: string;
  type: "variable" | "url";
  status: LinkStatus;
  reason?: string;
}

export interface LinksValidationResult {
  links: ExtractedLink[];
  allValid: boolean;
  validCount: number;
  invalidCount: number;
}

function extractVariableName(url: string): string | null {
  const match = url.match(/^\{\{([^}]+)\}\}$/);
  return match ? match[1].trim() : null;
}

function isVariableLink(url: string): boolean {
  return /^\{\{[^}]+\}\}$/.test(url.trim());
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function extractLinksFromContent(content: unknown): string[] {
  const links: string[] = [];

  function traverse(node: unknown): void {
    if (!node || typeof node !== "object") return;

    const obj = node as Record<string, unknown>;

    if (obj.attrs && typeof obj.attrs === "object") {
      const attrs = obj.attrs as Record<string, unknown>;
      if (typeof attrs.href === "string" && attrs.href.trim()) {
        links.push(attrs.href.trim());
      }
    }

    if (Array.isArray(obj.marks)) {
      for (const mark of obj.marks) {
        if (
          mark &&
          typeof mark === "object" &&
          (mark as Record<string, unknown>).type === "link"
        ) {
          const markAttrs = (mark as Record<string, unknown>).attrs;
          if (markAttrs && typeof markAttrs === "object") {
            const href = (markAttrs as Record<string, unknown>).href;
            if (typeof href === "string" && href.trim()) {
              links.push(href.trim());
            }
          }
        }
      }
    }

    if (Array.isArray(obj.content)) {
      for (const child of obj.content) {
        traverse(child);
      }
    }

    for (const value of Object.values(obj)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          traverse(item);
        }
      } else if (value && typeof value === "object") {
        traverse(value);
      }
    }
  }

  traverse(content);

  return [...new Set(links)];
}

function validateVariableLink(url: string): ExtractedLink {
  const variableName = extractVariableName(url);

  if (!variableName) {
    return {
      url,
      type: "variable",
      status: "invalid",
      reason: "Invalid variable syntax",
    };
  }

  if (VALID_LINK_VARIABLES.includes(variableName as ValidLinkVariable)) {
    return {
      url,
      type: "variable",
      status: "valid",
    };
  }

  return {
    url,
    type: "variable",
    status: "invalid",
    reason: `Unknown link variable: ${variableName}`,
  };
}

const URL_NOT_RESPONSIVE_MESSAGE =
  "Url seems to be not responsive. Please check again.";

async function pingUrl(url: string): Promise<ExtractedLink> {
  if (!isValidUrl(url)) {
    return {
      url,
      type: "url",
      status: "invalid",
      reason: URL_NOT_RESPONSIVE_MESSAGE,
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Kibamail Link Validator/1.0",
      },
    });

    clearTimeout(timeoutId);

    if (response.ok || (response.status >= 300 && response.status < 400)) {
      return {
        url,
        type: "url",
        status: "valid",
      };
    }

    if (response.status === 405) {
      const getResponse = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent": "Kibamail Link Validator/1.0",
        },
      });

      if (getResponse.ok) {
        return {
          url,
          type: "url",
          status: "valid",
        };
      }

      return {
        url,
        type: "url",
        status: "invalid",
        reason: URL_NOT_RESPONSIVE_MESSAGE,
      };
    }

    return {
      url,
      type: "url",
      status: "invalid",
      reason: URL_NOT_RESPONSIVE_MESSAGE,
    };
  } catch {
    return {
      url,
      type: "url",
      status: "invalid",
      reason: URL_NOT_RESPONSIVE_MESSAGE,
    };
  }
}

export async function validateLinks(
  urls: string[],
): Promise<LinksValidationResult> {
  const results: ExtractedLink[] = [];

  const variableLinks: string[] = [];
  const regularUrls: string[] = [];

  for (const url of urls) {
    if (isVariableLink(url)) {
      variableLinks.push(url);
    } else {
      regularUrls.push(url);
    }
  }

  for (const url of variableLinks) {
    results.push(validateVariableLink(url));
  }

  const CONCURRENCY_LIMIT = 5;
  for (let i = 0; i < regularUrls.length; i += CONCURRENCY_LIMIT) {
    const batch = regularUrls.slice(i, i + CONCURRENCY_LIMIT);
    const batchResults = await Promise.all(batch.map(pingUrl));
    results.push(...batchResults);
  }

  const validCount = results.filter((r) => r.status === "valid").length;
  const invalidCount = results.filter((r) => r.status === "invalid").length;

  return {
    links: results,
    allValid: invalidCount === 0,
    validCount,
    invalidCount,
  };
}

export async function validateContentLinks(
  contentJson: unknown,
): Promise<LinksValidationResult> {
  const urls = extractLinksFromContent(contentJson);

  if (urls.length === 0) {
    return {
      links: [],
      allValid: true,
      validCount: 0,
      invalidCount: 0,
    };
  }

  return validateLinks(urls);
}
