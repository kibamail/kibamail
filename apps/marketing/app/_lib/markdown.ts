import { marked } from "marked";
import { codeToHtml } from "shiki";

async function highlightCode(code: string, lang: string): Promise<string> {
  try {
    return await codeToHtml(code, {
      lang: lang || "text",
      theme: "material-theme-darker",
    });
  } catch {
    // Fallback for unsupported languages
    return `<pre><code class="language-${lang}">${escapeHtml(code)}</code></pre>`;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function renderMarkdown(content: string): Promise<string> {
  const renderer = new marked.Renderer();

  // Store code blocks to process async
  const codeBlocks: { id: string; code: string; lang: string }[] = [];

  renderer.code = ({ text, lang }) => {
    const id = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push({ id, code: text, lang: lang || "text" });
    return id;
  };

  marked.setOptions({
    gfm: true,
    breaks: false,
  });

  let html = marked.parse(content, { renderer }) as string;

  // Process code blocks with Shiki
  for (const block of codeBlocks) {
    const highlighted = await highlightCode(block.code, block.lang);
    html = html.replace(block.id, highlighted);
  }

  return html;
}
