import openApiSpec from "../../../../../../apps/web/public/openapi.v1.json";

// NavItem can be a tuple [title, href] or [title, href, method] for API endpoints
export type NavItem = [title: string, href: string, method?: string];
export type NavSection = {
  title: string;
  items: NavItem[];
};

export type SectionNavigation = NavSection[];

// Helper to convert tag to slug
function tagToSlug(tag: string): string {
  return tag.toLowerCase().replace(/\s+/g, "-");
}

// Helper to generate operation slug
function generateOperationSlug(method: string, path: string): string {
  const cleanPath = path
    .replace(/^\/v1\//, "")
    .replace(/\{[^}]+\}/g, "by-id")
    .replace(/\//g, "-");
  return `${method.toLowerCase()}-${cleanPath}`;
}

// Helper to format summary: "List Broadcasts" -> "List broadcasts"
function formatSummary(summary: string): string {
  if (!summary) return summary;
  const words = summary.split(" ");
  if (words.length <= 1) return summary;
  return words[0] + " " + words.slice(1).map((w) => w.toLowerCase()).join(" ");
}

// Documentation section - general docs
export const docsNavigation: SectionNavigation = [
  {
    title: "Getting Started",
    items: [
      ["Introduction", "/docs"],
      ["Quick Start", "/docs/quick-start"],
      ["Installation", "/docs/installation"],
    ],
  },
  {
    title: "Core Concepts",
    items: [
      ["Contacts", "/docs/contacts"],
      ["Custom Properties", "/docs/contact-properties"],
      ["Topics", "/docs/topics"],
      ["Segments", "/docs/segments"],
    ],
  },
  {
    title: "Email Campaigns",
    items: [
      ["Broadcasts", "/docs/broadcasts"],
      ["Email Editor", "/docs/email-editor"],
      ["A/B Testing", "/docs/ab-testing"],
    ],
  },
  {
    title: "Forms",
    items: [
      ["Forms Overview", "/docs/forms"],
      ["Form Builder", "/docs/form-builder"],
      ["Submissions", "/docs/form-submissions"],
    ],
  },
  {
    title: "Automations",
    items: [
      ["Automations Overview", "/docs/automations"],
      ["Triggers", "/docs/automation-triggers"],
      ["Actions", "/docs/automation-actions"],
    ],
  },
  {
    title: "Importing Data",
    items: [["Contact Imports", "/docs/contact-imports"]],
  },
  {
    title: "Sending Infrastructure",
    items: [
      ["Sending Domains", "/docs/sending-domains"],
      ["Sender Identities", "/docs/sender-identities"],
      ["Email Tracking", "/docs/tracking"],
    ],
  },
  {
    title: "Analytics & Events",
    items: [
      ["Events", "/docs/events"],
      ["Suppression List", "/docs/suppression-list"],
    ],
  },
  {
    title: "Integrations",
    items: [
      ["Webhooks", "/docs/webhooks"],
      ["API Keys", "/docs/api-keys"],
    ],
  },
  {
    title: "Settings",
    items: [["Workspaces", "/docs/workspaces"]],
  },
];

// API Reference section - dynamically generated from OpenAPI spec
function generateApiNavigation(): SectionNavigation {
  const spec = openApiSpec as {
    paths: Record<string, Record<string, unknown>>;
  };

  // Static overview section
  const overviewSection: NavSection = {
    title: "Overview",
    items: [
      ["Introduction", "/docs/api"],
      ["Authentication", "/docs/api/authentication"],
      ["Pagination", "/docs/api/pagination"],
      ["Errors", "/docs/api/errors"],
      ["Rate Limits", "/docs/api/rate-limits"],
    ],
  };

  // Build tag -> operations map from OpenAPI spec
  const tagMap = new Map<
    string,
    Array<{ method: string; path: string; summary: string; slug: string }>
  >();

  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (typeof operation !== "object" || operation === null) continue;

      const op = operation as { tags?: string[]; summary?: string };
      const tags = op.tags || [];

      for (const tag of tags) {
        if (!tagMap.has(tag)) {
          tagMap.set(tag, []);
        }

        const operationSlug = generateOperationSlug(method, path);
        tagMap.get(tag)!.push({
          method: method.toUpperCase(),
          path,
          summary: op.summary || "",
          slug: operationSlug,
        });
      }
    }
  }

  // Sort operations within each tag
  const methodOrder = ["GET", "POST", "PUT", "PATCH", "DELETE"];
  for (const ops of tagMap.values()) {
    ops.sort((a, b) => {
      const methodDiff =
        methodOrder.indexOf(a.method) - methodOrder.indexOf(b.method);
      if (methodDiff !== 0) return methodDiff;
      return a.path.localeCompare(b.path);
    });
  }

  // Create navigation sections from tags
  // Priority order for common tags
  const priorityTags = ["Contacts", "Topics", "Segments", "Forms"];
  const sortedTags = Array.from(tagMap.keys()).sort((a, b) => {
    const aIndex = priorityTags.indexOf(a);
    const bIndex = priorityTags.indexOf(b);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });

  const dynamicSections: NavSection[] = sortedTags.map((tag) => {
    const tagSlug = tagToSlug(tag);
    const operations = tagMap.get(tag) || [];

    return {
      title: tag,
      items: operations.map(
        (op) =>
          [formatSummary(op.summary), `/docs/api/${tagSlug}/${op.slug}`, op.method] as NavItem
      ),
    };
  });

  return [overviewSection, ...dynamicSections];
}

export const apiNavigation: SectionNavigation = generateApiNavigation();

// SDKs section
export const sdksNavigation: SectionNavigation = [
  {
    title: "Overview",
    items: [["SDKs Overview", "/docs/sdks"]],
  },
  {
    title: "Official SDKs",
    items: [
      ["Node.js", "/docs/sdks/nodejs"],
      ["Python", "/docs/sdks/python"],
      ["PHP", "/docs/sdks/php"],
      ["Go", "/docs/sdks/go"],
      ["Ruby", "/docs/sdks/ruby"],
    ],
  },
];

// Guides section
export const guidesNavigation: SectionNavigation = [
  {
    title: "Overview",
    items: [["Guides Overview", "/docs/guides"]],
  },
  {
    title: "Deliverability",
    items: [
      ["Email Deliverability", "/docs/guides/deliverability"],
      ["DKIM & SPF Setup", "/docs/guides/dkim-spf"],
      ["DMARC Configuration", "/docs/guides/dmarc"],
      ["Domain Warmup", "/docs/guides/domain-warmup"],
    ],
  },
  {
    title: "Best Practices",
    items: [
      ["List Hygiene", "/docs/guides/list-hygiene"],
      ["Email Content", "/docs/guides/email-content"],
    ],
  },
  {
    title: "Use Cases",
    items: [
      ["Transactional Emails", "/docs/guides/transactional-emails"],
      ["Newsletters", "/docs/guides/newsletters"],
      ["Welcome Series", "/docs/guides/welcome-series"],
      ["A/B Testing Guide", "/docs/guides/ab-testing"],
    ],
  },
  {
    title: "DNS Setup",
    items: [
      ["Cloudflare", "/docs/guides/dns/cloudflare"],
      ["GoDaddy", "/docs/guides/dns/godaddy"],
      ["Namecheap", "/docs/guides/dns/namecheap"],
      ["Route 53", "/docs/guides/dns/route53"],
      ["Google Domains", "/docs/guides/dns/google-domains"],
    ],
  },
  {
    title: "Troubleshooting",
    items: [
      ["Emails Going to Spam", "/docs/guides/troubleshooting/spam-folder"],
      ["Handling Bounces", "/docs/guides/troubleshooting/bounces"],
      ["Verification Failed", "/docs/guides/troubleshooting/verification-failed"],
    ],
  },
];

// Community section
export const communityNavigation: SectionNavigation = [
  {
    title: "Connect",
    items: [
      ["Open email forum", "/docs/community"],
      ["GitHub", "/docs/community/github"],
      ["X (Formerly Twitter)", "/docs/community/twitter"],
    ],
  },
];

// Company section
export const companyNavigation: SectionNavigation = [
  {
    title: "About",
    items: [
      ["Why we exist", "/docs/company"],
      ["How we operate", "/docs/company/how-we-operate"],
    ],
  },
  {
    title: "Legal",
    items: [
      ["Privacy Policy", "/legal/privacy-policy"],
      ["Terms of Service", "/legal/terms-of-service"],
      ["Acceptable Use Policy", "/legal/acceptable-use-policy"],
    ],
  },
];

// Top-level sections configuration
export const topLevelSections = [
  {
    id: "docs",
    label: "Documentation",
    href: "/docs",
    matchPattern: /^\/docs(?!\/(api|sdks|guides|community|company))/,
  },
  {
    id: "api",
    label: "API Reference",
    href: "/docs/api",
    matchPattern: /^\/docs\/api/,
  },
  {
    id: "sdks",
    label: "SDKs",
    href: "/docs/sdks",
    matchPattern: /^\/docs\/sdks/,
  },
  {
    id: "guides",
    label: "Guides",
    href: "/docs/guides",
    matchPattern: /^\/docs\/guides/,
  },
  {
    id: "community",
    label: "Community",
    href: "/docs/community",
    matchPattern: /^\/docs\/community/,
  },
  {
    id: "company",
    label: "Company",
    href: "/docs/company",
    matchPattern: /^\/docs\/company/,
  },
] as const;

export type SectionId = (typeof topLevelSections)[number]["id"];

// Get navigation for a specific section
export function getNavigationForSection(
  sectionId: SectionId
): SectionNavigation {
  switch (sectionId) {
    case "docs":
      return docsNavigation;
    case "api":
      return apiNavigation;
    case "sdks":
      return sdksNavigation;
    case "guides":
      return guidesNavigation;
    case "community":
      return communityNavigation;
    case "company":
      return companyNavigation;
    default:
      return docsNavigation;
  }
}

// Get active section based on pathname
export function getActiveSection(pathname: string): SectionId {
  for (const section of topLevelSections) {
    if (section.matchPattern.test(pathname)) {
      return section.id;
    }
  }
  return "docs";
}
