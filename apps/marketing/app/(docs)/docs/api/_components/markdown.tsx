import { marked } from "marked";

interface MarkdownProps {
  content: string;
  className?: string;
}

export function Markdown({ content, className = "" }: MarkdownProps) {
  // Configure marked for safe rendering
  marked.setOptions({
    gfm: true,
    breaks: true,
  });

  const html = marked.parse(content) as string;

  return (
    <div
      className={`kb-api-docs-content ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
