import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { TOCEntry } from "../_components/table-of-contents";

/**
 * Extracts table of contents from MDX file content
 * Parses h2 and h3 headings to build a nested TOC structure
 */
export function extractTOC(content: string): TOCEntry[] {
  const toc: TOCEntry[] = [];
  const lines = content.split("\n");

  // Regex to match markdown headings (## or ###)
  const headingRegex = /^(#{2,3})\s+(.+)$/;

  let currentH2: TOCEntry | null = null;

  for (const line of lines) {
    const match = line.match(headingRegex);
    if (!match) continue;

    const [, hashes, text] = match;
    const level = hashes.length as 2 | 3;

    // Clean the heading text (remove any inline code backticks, links, etc.)
    const cleanText = text
      .replace(/`([^`]+)`/g, "$1") // Remove backticks
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove links
      .trim();

    // Generate slug from text
    const slug = cleanText
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");

    if (level === 2) {
      currentH2 = {
        level: 2,
        text: cleanText,
        slug,
        children: [],
      };
      toc.push(currentH2);
    } else if (level === 3 && currentH2 && currentH2.children) {
      currentH2.children.push({
        level: 3,
        text: cleanText,
        slug,
      });
    }
  }

  return toc;
}

/**
 * Gets TOC and frontmatter from an MDX file path
 */
export async function getTOCFromFile(filePath: string): Promise<{
  toc: TOCEntry[];
  frontmatter: {
    title?: string;
    description?: string;
    category?: string;
  };
}> {
  try {
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);

    const fileContent = fs.readFileSync(absolutePath, "utf-8");
    const { content, data: frontmatter } = matter(fileContent);

    const toc = extractTOC(content);

    return {
      toc,
      frontmatter: {
        title: frontmatter.title,
        description: frontmatter.description,
        category: frontmatter.category,
      },
    };
  } catch {
    return {
      toc: [],
      frontmatter: {},
    };
  }
}

/**
 * Resolves the MDX file path for a given docs route
 */
export function getMDXFilePath(docsPath: string): string {
  // Remove leading slash and 'docs' prefix
  const segments = docsPath.replace(/^\/docs\/?/, "").split("/").filter(Boolean);

  // Build the file path
  const relativePath =
    segments.length === 0
      ? "app/(docs)/docs/content/index.mdx"
      : `app/(docs)/docs/content/${segments.join("/")}.mdx`;

  return relativePath;
}
