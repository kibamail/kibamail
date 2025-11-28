import fs from "node:fs/promises"
import path from "node:path"

const typesDirectoryRoot = path.resolve(process.cwd(), "dist", "types")
const typesDirectory = typesDirectoryRoot

const esmDirectory = path.resolve(process.cwd(), "dist", "esm")
const cjsDirectory = path.resolve(process.cwd(), "dist", "cjs")

async function main() {
  const files = await fs.readdir(typesDirectory, {
    withFileTypes: true,
    recursive: true,
  })

  for (const file of files) {
    if (file.isDirectory()) {
      continue
    }

    if (file.name.includes("stories")) {
      continue
    }

    let [, relativePath] = file.parentPath.split("dist/types")

    const sourcePath = path.resolve(file.parentPath, file.name)

    relativePath = relativePath.startsWith("/")
      ? relativePath.substring(1)
      : relativePath

    const esmPath = path.resolve(esmDirectory, relativePath, file.name)

    const cjsPath = path.resolve(cjsDirectory, relativePath, file.name)

    await fs.copyFile(sourcePath, esmPath)
    await fs.copyFile(sourcePath, cjsPath)
  }

  await fs.rm(typesDirectoryRoot, { recursive: true })

}

main()
