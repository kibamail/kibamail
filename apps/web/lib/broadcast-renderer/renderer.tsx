import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import type {
  BroadcastDocument,
  BroadcastStyles,
  Mark,
  Node,
  RenderContext,
} from "./types";

function toReactStyle(
  customStyle?: Record<string, unknown>
): React.CSSProperties {
  if (!customStyle) return {};

  const style: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(customStyle)) {
    if (value !== null && value !== undefined && value !== "") {
      style[key] = value;
    }
  }

  return style as React.CSSProperties;
}

function replaceVariables(text: string, context: RenderContext): string {
  if (!context.variables) return text;

  return text.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, varName) => {
    return context.variables?.[varName] ?? match;
  });
}

function renderMarks(
  text: string,
  marks: Mark[] | undefined,
  context: RenderContext,
  key: string
): React.ReactNode {
  const processedText = replaceVariables(text, context);

  if (!marks || marks.length === 0) {
    return processedText;
  }

  let result: React.ReactNode = processedText;

  for (let i = marks.length - 1; i >= 0; i--) {
    const mark = marks[i];

    switch (mark.type) {
      case "bold":
        result = <strong key={`${key}-bold-${i}`}>{result}</strong>;
        break;

      case "italic":
        result = <em key={`${key}-italic-${i}`}>{result}</em>;
        break;

      case "strike":
        result = (
          <span
            key={`${key}-strike-${i}`}
            style={{ textDecoration: "line-through" }}
          >
            {result}
          </span>
        );
        break;

      case "underline":
        result = (
          <span
            key={`${key}-underline-${i}`}
            style={{ textDecoration: "underline" }}
          >
            {result}
          </span>
        );
        break;

      case "code":
        result = (
          <span
            key={`${key}-code-${i}`}
            style={{
              backgroundColor: "#f4f4f4",
              padding: "2px 4px",
              fontFamily: "Consolas, Monaco, 'Courier New', monospace",
              fontSize: "0.9em",
            }}
          >
            {result}
          </span>
        );
        break;

      case "link": {
        const href = replaceVariables(
          (mark.attrs?.href as string) || "#",
          context
        );
        result = (
          <Link
            key={`${key}-link-${i}`}
            href={href}
            target={(mark.attrs?.target as string) || "_blank"}
          >
            {result}
          </Link>
        );
        break;
      }

      case "textStyle": {
        const textStyleAttrs = mark.attrs || {};
        const textStyle: React.CSSProperties = {};
        if (textStyleAttrs.color)
          textStyle.color = textStyleAttrs.color as string;
        result = (
          <span key={`${key}-textStyle-${i}`} style={textStyle}>
            {result}
          </span>
        );
        break;
      }

      case "highlight": {
        const highlightColor = (mark.attrs?.color as string) || "yellow";
        result = (
          <span
            key={`${key}-highlight-${i}`}
            style={{ backgroundColor: highlightColor }}
          >
            {result}
          </span>
        );
        break;
      }

      case "superscript":
        result = <sup key={`${key}-sup-${i}`}>{result}</sup>;
        break;

      case "subscript":
        result = <sub key={`${key}-sub-${i}`}>{result}</sub>;
        break;

      default:
        break;
    }
  }

  return result;
}

function renderNode(
  node: Node,
  context: RenderContext,
  key: string,
  styles: BroadcastStyles = {}
): React.ReactNode {
  const { type, attrs, content, marks, text } = node;
  const customStyle = toReactStyle(
    attrs?.customStyle as Record<string, unknown>
  );

  switch (type) {
    case "text":
      return renderMarks(text || "", marks, context, key);

    case "paragraph": {
      const textAlign = attrs?.textAlign as string | undefined;

      const style: React.CSSProperties = {
        ...styles.paragraph,
        ...customStyle,
        ...(textAlign
          ? { textAlign: textAlign as React.CSSProperties["textAlign"] }
          : {}),
      };

      if (!content || content.length === 0) {
        return (
          <Text key={key} style={{ ...style, minHeight: "1em" }}>
            &nbsp;
          </Text>
        );
      }

      return (
        <Text key={key} style={style}>
          {content.map((child, i) =>
            renderNode(child, context, `${key}-${i}`, styles)
          )}
        </Text>
      );
    }

    case "heading": {
      const level = (attrs?.level as number) || 1;
      const textAlign = attrs?.textAlign as string | undefined;

      const headingKey = `h${Math.min(
        Math.max(level, 1),
        6
      )}` as keyof NonNullable<BroadcastStyles["heading"]>;
      const levelStyle = styles.heading?.[headingKey] || {};

      const style: React.CSSProperties = {
        ...levelStyle,
        ...customStyle,
        ...(textAlign
          ? { textAlign: textAlign as React.CSSProperties["textAlign"] }
          : {}),
      };

      const as = `h${Math.min(Math.max(level, 1), 6)}` as
        | "h1"
        | "h2"
        | "h3"
        | "h4"
        | "h5"
        | "h6";

      return (
        <Heading key={key} as={as} style={style}>
          {content?.map((child, i) =>
            renderNode(child, context, `${key}-${i}`, styles)
          )}
        </Heading>
      );
    }

    case "image": {
      const src = attrs?.src as string;
      const alt = (attrs?.alt as string) || "";
      const title = attrs?.title as string | undefined;
      const width = attrs?.width as number | undefined;
      const height = attrs?.height as number | undefined;
      const dataAlign = attrs?.["data-align"] as string | undefined;

      const alignmentStyle: React.CSSProperties = (() => {
        switch (dataAlign) {
          case "center":
            return { display: "block", margin: "0 auto" };
          case "right":
            return { display: "block", marginLeft: "auto", marginRight: "0" };
          default:
            return { display: "block" };
        }
      })();

      const imgStyle: React.CSSProperties = {
        maxWidth: "100%",
        height: "auto",
        ...alignmentStyle,
        ...styles.image,
        ...customStyle,
      };

      return (
        <Img
          key={key}
          src={src}
          alt={alt}
          title={title}
          width={width || undefined}
          height={height || undefined}
          style={imgStyle}
        />
      );
    }

    case "button": {
      const href = replaceVariables((attrs?.href as string) || "#", context);
      const align = (attrs?.align as string) || "left";
      const fullWidth = attrs?.fullWidth as boolean;

      const alignmentStyle: React.CSSProperties = (() => {
        switch (align) {
          case "center":
            return { margin: "0 auto" };
          case "right":
            return { marginLeft: "auto", marginRight: "0" };
          default:
            return {};
        }
      })();

      const buttonStyle: React.CSSProperties = {
        display: "block",
        textDecoration: "none",
        ...alignmentStyle,
        ...styles.button,
        ...customStyle,
        ...(fullWidth ? { width: "100%" } : {}),
      };

      return (
        <Button key={key} href={href} style={buttonStyle}>
          {content?.map((child, i) =>
            renderNode(child, context, `${key}-${i}`, styles)
          )}
        </Button>
      );
    }

    case "panel": {
      const panelStyle: React.CSSProperties = {
        ...styles.panel,
        ...customStyle,
      };

      return (
        <Section key={key} style={panelStyle}>
          {content?.map((child, i) =>
            renderNode(child, context, `${key}-${i}`, styles)
          )}
        </Section>
      );
    }

    case "horizontalRule": {
      const borderColor = (customStyle.backgroundColor as string) || "#e5e5e5";

      const hrStyle: React.CSSProperties = {
        borderColor,
        borderTop: `1px solid ${borderColor}`,
        margin: "24px 0",
        ...styles.horizontalRule,
        ...customStyle,
      };

      return <Hr key={key} style={hrStyle} />;
    }

    case "hardBreak":
      return <br key={key} />;

    case "variable": {
      const varName = attrs?.name as string;
      const fallback = attrs?.fallback as string | undefined;
      const value =
        context.variables?.[varName] ?? fallback ?? `{{${varName}}}`;
      return <React.Fragment key={key}>{value}</React.Fragment>;
    }

    case "bulletList": {
      const listStyle: React.CSSProperties = {
        paddingLeft: "20px",
        margin: "8px 0",
        ...styles.bulletList,
      };

      return (
        <ul key={key} style={listStyle}>
          {content?.map((child, i) =>
            renderNode(child, context, `${key}-${i}`, styles)
          )}
        </ul>
      );
    }

    case "orderedList": {
      const listStyle: React.CSSProperties = {
        paddingLeft: "20px",
        margin: "8px 0",
        ...styles.orderedList,
      };

      return (
        <ol key={key} style={listStyle}>
          {content?.map((child, i) =>
            renderNode(child, context, `${key}-${i}`, styles)
          )}
        </ol>
      );
    }

    case "listItem": {
      return (
        <li key={key}>
          {content?.map((child, i) =>
            renderNode(child, context, `${key}-${i}`, styles)
          )}
        </li>
      );
    }

    case "blockquote": {
      const blockquoteStyle: React.CSSProperties = {
        borderLeftWidth: "4px",
        borderLeftStyle: "solid",
        borderLeftColor: "#e5e5e5",
        paddingLeft: "16px",
        margin: "8px 0",
        color: "#666",
        ...styles.blockquote,
        ...customStyle,
      };

      return (
        <blockquote key={key} style={blockquoteStyle}>
          {content?.map((child, i) =>
            renderNode(child, context, `${key}-${i}`, styles)
          )}
        </blockquote>
      );
    }

    case "codeBlock": {
      const codeBlockStyle: React.CSSProperties = {
        backgroundColor: "#f4f4f4",
        padding: "16px",
        fontFamily: "Consolas, Monaco, 'Courier New', monospace",
        fontSize: "14px",
        whiteSpace: "pre-wrap",
        ...styles.codeBlock,
        ...customStyle,
      };

      return (
        <div key={key} style={codeBlockStyle}>
          {content?.map((child, i) =>
            renderNode(child, context, `${key}-${i}`, styles)
          )}
        </div>
      );
    }

    default:
      if (content && content.length > 0) {
        return (
          <React.Fragment key={key}>
            {content.map((child, i) =>
              renderNode(child, context, `${key}-${i}`, styles)
            )}
          </React.Fragment>
        );
      }
      return null;
  }
}

const defaultStyles: BroadcastStyles = {
  body: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  container: {},
};

function renderBroadcastEmail(
  document: BroadcastDocument,
  context: RenderContext = {},
  styles: BroadcastStyles = {}
): React.ReactElement {
  const { body, container, ...restStyles } = styles;

  const mergedStyles: BroadcastStyles = {
    body: { ...defaultStyles.body, ...body },
    container: { ...defaultStyles.container, ...container },
    ...restStyles,
  };

  return (
    <Html>
      <Head />
      <Body style={mergedStyles.body}>
        <Container style={mergedStyles.container}>
          {document.content.map((node, i) =>
            renderNode(node, context, `node-${i}`, mergedStyles)
          )}
        </Container>
      </Body>
    </Html>
  );
}

export async function renderBroadcastToHtml(
  document: BroadcastDocument,
  context: RenderContext = {},
  styles: BroadcastStyles = {}
): Promise<string> {
  const { render } = await import("@react-email/components");
  const element = renderBroadcastEmail(document, context, styles);
  return render(element);
}
