import esbuild from "esbuild"
import fs from "node:fs"
import path from "node:path"
import { glob } from "glob"

const esmOutputDirectory = "dist/esm"
const cjsOutputDirectory = "dist/cjs"

const entryPoints = glob
  .sync("components/**/*.ts*")
  .filter((file) => !file.includes(".stories."))

async function main() {
  await esbuild.build({
    format: "esm",
    target: "es2020",
    sourcemap: true,
    minify: true,
    outdir: esmOutputDirectory,
    entryPoints,
  })

  await esbuild.build({
    format: "cjs",
    target: "es2020",
    sourcemap: true,
    minify: true,
    outdir: cjsOutputDirectory,
    entryPoints,
  })

  if (!fs.existsSync(esmOutputDirectory)) {
    fs.mkdirSync(esmOutputDirectory, { recursive: true })
  }

  if (!fs.existsSync(cjsOutputDirectory)) {
    fs.mkdirSync(cjsOutputDirectory, { recursive: true })
  }

  fs.writeFileSync(
    path.join(esmOutputDirectory, "package.json"),
    JSON.stringify({ type: "module" }, null, 2) + "\n",
    "utf-8"
  )

}

main()
