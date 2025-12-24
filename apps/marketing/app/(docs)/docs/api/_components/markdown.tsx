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
      className={`prose prose-sm max-w-none prose-headings:text-kb-content-primary prose-p:text-kb-content-secondary prose-strong:text-kb-content-primary prose-code:rounded prose-code:bg-kb-bg-inset prose-code:px-1.5 prose-code:py-0.5 prose-code:text-kb-content-primary prose-code:before:content-none prose-code:after:content-none prose-pre:bg-kb-bg-inset prose-pre:border prose-pre:border-kb-border-secondary prose-li:text-kb-content-secondary prose-a:text-kb-accent-primary prose-a:no-underline hover:prose-a:underline ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
