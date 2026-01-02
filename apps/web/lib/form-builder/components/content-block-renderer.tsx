"use client";

import * as React from "react";

// TipTap JSON node types
interface TipTapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

interface TipTapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
  text?: string;
  marks?: TipTapMark[];
}

interface TipTapDocument {
  type: "doc";
  content?: TipTapNode[];
}

interface ContentBlockRendererProps {
  content: Record<string, unknown> | undefined;
}

// Render text with marks (bold, italic, etc.)
function renderTextWithMarks(text: string, marks?: TipTapMark[]): React.ReactNode {
  if (!marks || marks.length === 0) {
    return text;
  }

  let result: React.ReactNode = text;

  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
        result = <strong>{result}</strong>;
        break;
      case "italic":
        result = <em>{result}</em>;
        break;
      case "underline":
        result = <u>{result}</u>;
        break;
      case "strike":
        result = <s>{result}</s>;
        break;
      case "code":
        result = <code>{result}</code>;
        break;
      case "link":
        result = (
          <a
            href={mark.attrs?.href as string}
            target={mark.attrs?.target as string}
            rel="noopener noreferrer"
          >
            {result}
          </a>
        );
        break;
    }
  }

  return result;
}

// Render inline content (text nodes with marks)
function renderInlineContent(content?: TipTapNode[]): React.ReactNode {
  if (!content || content.length === 0) return null;

  return content.map((node, index) => {
    if (node.type === "text" && node.text) {
      return (
        <React.Fragment key={index}>
          {renderTextWithMarks(node.text, node.marks)}
        </React.Fragment>
      );
    }
    if (node.type === "hardBreak") {
      return <br key={index} />;
    }
    return null;
  });
}

// Render a single TipTap node
function renderNode(node: TipTapNode, index: number): React.ReactNode {
  switch (node.type) {
    case "paragraph": {
      const content = renderInlineContent(node.content);
      // Render empty paragraphs with a <br /> to preserve spacing
      return <p key={index}>{content ?? <br />}</p>;
    }

    case "heading": {
      const level = (node.attrs?.level as number) ?? 1;
      switch (level) {
        case 1:
          return <h1 key={index}>{renderInlineContent(node.content)}</h1>;
        case 2:
          return <h2 key={index}>{renderInlineContent(node.content)}</h2>;
        case 3:
          return <h3 key={index}>{renderInlineContent(node.content)}</h3>;
        case 4:
          return <h4 key={index}>{renderInlineContent(node.content)}</h4>;
        case 5:
          return <h5 key={index}>{renderInlineContent(node.content)}</h5>;
        case 6:
          return <h6 key={index}>{renderInlineContent(node.content)}</h6>;
        default:
          return <h1 key={index}>{renderInlineContent(node.content)}</h1>;
      }
    }

    case "bulletList":
      return (
        <ul key={index}>
          {node.content?.map((item, i) => renderNode(item, i))}
        </ul>
      );

    case "orderedList":
      return (
        <ol key={index}>
          {node.content?.map((item, i) => renderNode(item, i))}
        </ol>
      );

    case "listItem":
      return (
        <li key={index}>
          {node.content?.map((child, i) => renderNode(child, i))}
        </li>
      );

    case "blockquote":
      return (
        <blockquote key={index}>
          {node.content?.map((child, i) => renderNode(child, i))}
        </blockquote>
      );

    case "codeBlock":
      return (
        <pre key={index}>
          <code>{renderInlineContent(node.content)}</code>
        </pre>
      );

    case "image": {
      const src = node.attrs?.src as string;
      const alt = (node.attrs?.alt as string) ?? "";
      const title = node.attrs?.title as string | undefined;
      const width = node.attrs?.width as number | null | undefined;
      const height = node.attrs?.height as number | null | undefined;
      const align = node.attrs?.["data-align"] as string | undefined;
      const showCaption = node.attrs?.showCaption as boolean | undefined;

      const alignmentClass =
        align === "center"
          ? "flex justify-center"
          : align === "right"
            ? "flex justify-end"
            : "";

      const img = (
        <img
          src={src}
          alt={alt}
          title={title}
          width={width ?? undefined}
          height={height ?? undefined}
          style={{
            maxWidth: "100%",
            height: "auto",
          }}
        />
      );

      const content = showCaption && title ? (
        <figure>
          {img}
          <figcaption>{title}</figcaption>
        </figure>
      ) : (
        img
      );

      return (
        <div key={index} className={alignmentClass}>
          {content}
        </div>
      );
    }

    case "horizontalRule":
      return <hr key={index} />;

    default:
      // For unknown node types, try to render their content
      if (node.content) {
        return (
          <div key={index}>
            {node.content.map((child, i) => renderNode(child, i))}
          </div>
        );
      }
      return null;
  }
}

export function ContentBlockRenderer({ content }: ContentBlockRendererProps) {
  if (!content) {
    return null;
  }

  const doc = content as unknown as TipTapDocument;

  if (doc.type !== "doc" || !doc.content) {
    return null;
  }

  return <div>{doc.content.map((node, index) => renderNode(node, index))}</div>;
}
