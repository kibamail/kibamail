import fs from "node:fs";
import path from "node:path";

const CONTENT_DIR = path.join(process.cwd(), "content", "blog");

export interface BlogAuthor {
  name: string;
  avatar: string;
}

export interface BlogCategory {
  name: string;
  slug: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: BlogCategory;
  author: BlogAuthor;
  content: string;
  image?: string;
}

interface BlogPostFrontmatter {
  title: string;
  description: string;
  date: string;
  author: string;
  authorAvatar: string;
  image?: string;
}

/**
 * Parse frontmatter from markdown content
 * Frontmatter is YAML between --- delimiters at the start of the file
 */
function parseFrontmatter(content: string): {
  data: BlogPostFrontmatter;
  content: string;
} {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    throw new Error("Invalid frontmatter format");
  }

  const [, frontmatterStr, markdownContent] = match;
  const data: Record<string, string> = {};

  // Parse simple YAML (key: value format)
  for (const line of frontmatterStr.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();
      // Remove quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      data[key] = value;
    }
  }

  return {
    data: data as unknown as BlogPostFrontmatter,
    content: markdownContent.trim(),
  };
}

/**
 * Convert category slug to display name
 */
function categorySlugToName(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Get all blog posts sorted by date (newest first)
 */
export async function getAllBlogPosts(): Promise<BlogPost[]> {
  const posts: BlogPost[] = [];

  // Read all category directories
  const categories = fs.readdirSync(CONTENT_DIR, { withFileTypes: true });

  for (const category of categories) {
    if (!category.isDirectory()) continue;

    const categorySlug = category.name;
    const categoryPath = path.join(CONTENT_DIR, categorySlug);
    const files = fs.readdirSync(categoryPath);

    for (const file of files) {
      if (!file.endsWith(".md")) continue;

      const slug = file.replace(".md", "");
      const filePath = path.join(categoryPath, file);
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const { data, content } = parseFrontmatter(fileContent);

      posts.push({
        slug,
        title: data.title,
        description: data.description,
        date: data.date,
        image: data.image,
        category: {
          slug: categorySlug,
          name: categorySlugToName(categorySlug),
        },
        author: {
          name: data.author,
          avatar: data.authorAvatar,
        },
        content,
      });
    }
  }

  // Sort by date (newest first)
  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

/**
 * Get a single blog post by slug
 */
export async function getBlogPostBySlug(
  slug: string
): Promise<BlogPost | null> {
  const categories = fs.readdirSync(CONTENT_DIR, { withFileTypes: true });

  for (const category of categories) {
    if (!category.isDirectory()) continue;

    const categorySlug = category.name;
    const filePath = path.join(CONTENT_DIR, categorySlug, `${slug}.md`);

    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const { data, content } = parseFrontmatter(fileContent);

      return {
        slug,
        title: data.title,
        description: data.description,
        date: data.date,
        image: data.image,
        category: {
          slug: categorySlug,
          name: categorySlugToName(categorySlug),
        },
        author: {
          name: data.author,
          avatar: data.authorAvatar,
        },
        content,
      };
    }
  }

  return null;
}

/**
 * Get all blog post slugs for static generation
 */
export async function getAllBlogSlugs(): Promise<string[]> {
  const posts = await getAllBlogPosts();
  return posts.map((post) => post.slug);
}

/**
 * Get blog posts by category
 */
export async function getBlogPostsByCategory(
  categorySlug: string
): Promise<BlogPost[]> {
  const posts = await getAllBlogPosts();
  return posts.filter((post) => post.category.slug === categorySlug);
}

/**
 * Get all categories with post counts
 */
export async function getAllCategories(): Promise<
  Array<BlogCategory & { count: number }>
> {
  const posts = await getAllBlogPosts();
  const categoryMap = new Map<string, { category: BlogCategory; count: number }>();

  for (const post of posts) {
    const existing = categoryMap.get(post.category.slug);
    if (existing) {
      existing.count++;
    } else {
      categoryMap.set(post.category.slug, {
        category: post.category,
        count: 1,
      });
    }
  }

  return Array.from(categoryMap.values()).map(({ category, count }) => ({
    ...category,
    count,
  }));
}
