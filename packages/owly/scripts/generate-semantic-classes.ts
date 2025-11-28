import fs from "fs";
import postcss from "postcss";

const semanticVariables: Record<string, string[]> = {
  "--border": [],
  "--background": [],
  "--content": [],
};

const semanticCssStyleDeclarations: Record<string, string> = {
  border: "border-color",
  background: "background-color",
  content: "color",
};

function getAllSemanticColorVariables() {
  const filesWithApplyDefinitions = ["styles/tokens/colors.css"];

  for (const file of filesWithApplyDefinitions) {
    const css = fs.readFileSync(file, "utf-8");

    const parsedCss = postcss.parse(css);

    parsedCss.walkRules((rule) => {
      rule.walkDecls((declaration) => {
        for (const [semanticKey] of Object.entries(semanticVariables)) {
          if (declaration.prop.includes(semanticKey)) {
            semanticVariables[semanticKey].push(declaration.prop);
          }
        }
      });
    });
  }
}

getAllSemanticColorVariables();

const rules: string[] = [];

for (const [name, variables] of Object.entries(semanticVariables)) {
  const classPrefix = name.slice(2);

  const styleDeclaration = semanticCssStyleDeclarations[classPrefix];

  for (const variable of variables) {
    const variableClassName = variable.split(name)?.[1].slice(1);

    const rule = `.kb-${classPrefix}-${variableClassName} {
      ${styleDeclaration}: var(${variable});
    }`;

    rules.push(rule);
  }
}

fs.writeFileSync("dist/styles/semantic-classes.css", rules.join("\n"));
