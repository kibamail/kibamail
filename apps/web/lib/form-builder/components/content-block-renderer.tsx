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
function renderTextWithMarks(
  text: string,
  marks?: TipTapMark[],
): React.ReactNode {
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
function renderInlineContent(
  content: TipTapNode[] | undefined,
  keyPrefix: string,
): React.ReactNode {
  if (!content || content.length === 0) return null;

  return content.map((node, idx) => {
    const nodeKey = `${keyPrefix}-inline-${idx}`;
    if (node.type === "text" && node.text) {
      return (
        <React.Fragment key={nodeKey}>
          {renderTextWithMarks(node.text, node.marks)}
        </React.Fragment>
      );
    }
    if (node.type === "hardBreak") {
      return <br key={nodeKey} />;
    }
    return null;
  });
}

// Render a single TipTap node with a unique path-based key
function renderNode(node: TipTapNode, keyPath: string): React.ReactNode {
  switch (node.type) {
    case "paragraph": {
      const content = renderInlineContent(node.content, keyPath);
      // Render empty paragraphs with a <br /> to preserve spacing
      return <p key={keyPath}>{content ?? <br />}</p>;
    }

    case "heading": {
      const level = (node.attrs?.level as number) ?? 1;
      const headingContent = renderInlineContent(node.content, keyPath);
      switch (level) {
        case 1:
          return <h1 key={keyPath}>{headingContent}</h1>;
        case 2:
          return <h2 key={keyPath}>{headingContent}</h2>;
        case 3:
          return <h3 key={keyPath}>{headingContent}</h3>;
        case 4:
          return <h4 key={keyPath}>{headingContent}</h4>;
        case 5:
          return <h5 key={keyPath}>{headingContent}</h5>;
        case 6:
          return <h6 key={keyPath}>{headingContent}</h6>;
        default:
          return <h1 key={keyPath}>{headingContent}</h1>;
      }
    }

    case "bulletList":
      return (
        <ul key={keyPath}>
          {node.content?.map((item, idx) =>
            renderNode(item, `${keyPath}-${idx}`),
          )}
        </ul>
      );

    case "orderedList":
      return (
        <ol key={keyPath}>
          {node.content?.map((item, idx) =>
            renderNode(item, `${keyPath}-${idx}`),
          )}
        </ol>
      );

    case "listItem":
      return (
        <li key={keyPath}>
          {node.content?.map((child, idx) =>
            renderNode(child, `${keyPath}-${idx}`),
          )}
        </li>
      );

    case "blockquote":
      return (
        <blockquote key={keyPath}>
          {node.content?.map((child, idx) =>
            renderNode(child, `${keyPath}-${idx}`),
          )}
        </blockquote>
      );

    case "codeBlock":
      return (
        <pre key={keyPath}>
          <code>{renderInlineContent(node.content, keyPath)}</code>
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

      const content =
        showCaption && title ? (
          <figure>
            {img}
            <figcaption>{title}</figcaption>
          </figure>
        ) : (
          img
        );

      return (
        <div key={keyPath} className={alignmentClass}>
          {content}
        </div>
      );
    }

    case "horizontalRule":
      return <hr key={keyPath} />;

    default:
      // For unknown node types, try to render their content
      if (node.content) {
        return (
          <div key={keyPath}>
            {node.content.map((child, idx) =>
              renderNode(child, `${keyPath}-${idx}`),
            )}
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

  return (
    <div>{doc.content.map((node, idx) => renderNode(node, `node-${idx}`))}</div>
  );
}
