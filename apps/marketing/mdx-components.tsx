import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import React from "react";
import { Callout } from "./app/(docs)/docs/_components/mdx/callout";
import { CodeBlock } from "./app/(docs)/docs/_components/mdx/code-block";
import { Steps, Step } from "./app/(docs)/docs/_components/mdx/steps";

// Generate a slug from text content
function generateSlug(children: React.ReactNode): string {
  const text = extractTextFromChildren(children);
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

// Extract plain text from React children
function extractTextFromChildren(children: React.ReactNode): string {
  if (typeof children === "string") {
    return children;
  }
  if (typeof children === "number") {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map(extractTextFromChildren).join("");
  }
  if (React.isValidElement(children)) {
    const props = children.props as { children?: React.ReactNode };
    if (props.children) {
      return extractTextFromChildren(props.children);
    }
  }
  return "";
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // Headings - generate IDs from children text
    h1: ({ children }) => {
      const id = generateSlug(children);
      return (
        <h1
          id={id}
          className="text-3xl font-bold tracking-tight text-kb-content-primary mt-8 mb-4 first:mt-0"
        >
          {children}
        </h1>
      );
    },
    h2: ({ children }) => {
      const id = generateSlug(children);
      return (
        <h2
          id={id}
          className="text-2xl font-semibold tracking-tight text-kb-content-primary mt-10 mb-4 pb-2 border-b border-kb-border-tertiary scroll-mt-20"
        >
          {children}
        </h2>
      );
    },
    h3: ({ children }) => {
      const id = generateSlug(children);
      return (
        <h3
          id={id}
          className="text-xl font-semibold text-kb-content-primary mt-8 mb-3 scroll-mt-20"
        >
          {children}
        </h3>
      );
    },
    h4: ({ children }) => {
      const id = generateSlug(children);
      return (
        <h4
          id={id}
          className="text-lg font-semibold text-kb-content-primary mt-6 mb-2 scroll-mt-20"
        >
          {children}
        </h4>
      );
    },

    // Paragraphs
    p: ({ children }) => (
      <p className="text-kb-content-secondary leading-7 mb-4">{children}</p>
    ),

    // Links
    a: ({ href, children }) => {
      const isExternal = href?.startsWith("http");
      if (isExternal) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-kb-content-brand hover:underline"
          >
            {children}
          </a>
        );
      }
      return (
        <Link href={href || "#"} className="text-kb-content-brand hover:underline">
          {children}
        </Link>
      );
    },

    // Lists
    ul: ({ children }) => (
      <ul className="list-disc list-outside ml-6 mb-4 space-y-2 text-kb-content-secondary">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-outside ml-6 mb-4 space-y-2 text-kb-content-secondary">
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="leading-7">{children}</li>,

    // Code
    pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
    code: ({ children, className }) => {
      // Inline code (no className means it's inline)
      if (!className) {
        return (
          <code className="px-1.5 py-0.5 rounded bg-kb-surface-secondary text-kb-content-primary font-mono text-sm">
            {children}
          </code>
        );
      }
      // Block code - will be handled by pre > CodeBlock
      return <code className={className}>{children}</code>;
    },

    // Blockquote
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-kb-border-tertiary pl-4 my-4 italic text-kb-content-secondary">
        {children}
      </blockquote>
    ),

    // Table
    table: ({ children }) => (
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm border-collapse">{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="border-b border-kb-border-tertiary">{children}</thead>
    ),
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => (
      <tr className="border-b border-kb-border-tertiary">{children}</tr>
    ),
    th: ({ children }) => (
      <th className="text-left py-3 px-4 font-semibold text-kb-content-primary">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="py-3 px-4 text-kb-content-secondary">{children}</td>
    ),

    // Horizontal rule
    hr: () => <hr className="my-8 border-kb-border-tertiary" />,

    // Strong and emphasis
    strong: ({ children }) => (
      <strong className="font-semibold text-kb-content-primary">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,

    // Custom components
    Callout,
    Steps,
    Step,

    ...components,
  };
}
