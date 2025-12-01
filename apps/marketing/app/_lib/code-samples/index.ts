import { codeToHtml } from "shiki";
import * as languages from "./languages";

export interface CodeSample {
  id: string;
  label: string;
  language: string;
  code: string;
  html: {
    light: string;
    dark: string;
  };
}

export type CodeSamplesMap = Record<string, CodeSample>;

export async function generateCodeSamples(): Promise<CodeSamplesMap> {
  const samples: CodeSamplesMap = {};

  const entries = Object.entries(languages) as [
    string,
    { language: string; label: string; code: string }
  ][];

  await Promise.all(
    entries.map(async ([id, { language, label, code }]) => {
      const [light, dark] = await Promise.all([
        codeToHtml(code, {
          lang: language,
          theme: "github-light",
        }),
        codeToHtml(code, {
          lang: language,
          theme: "github-dark",
        }),
      ]);

      samples[id] = {
        id,
        label,
        language,
        code,
        html: { light, dark },
      };
    })
  );

  return samples;
}
