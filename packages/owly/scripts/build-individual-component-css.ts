import fs from "node:fs/promises"
import path from "node:path"
import { execSync } from 'child_process'

async function main() {
 const componentCssFiles = await fs.readdir(path.resolve(process.cwd(), "components"), {
  withFileTypes: true,
  recursive: true,
 })

 for (const file of componentCssFiles) {
  if (!file.name.endsWith(".css")) {
   continue
  }
  const command = `pnpm postcss ${file.parentPath}/${file.name} -o dist/styles/${file.name}`

  console.log(`Executing build command for ${file.name}...`)
  execSync(command)
 }
}

main()
