import { type DMMF } from "@prisma/generator-helper"
import { type GQLoomGeneratorConfig } from "."
import * as fs from "fs/promises"

export async function genJSFile(
  dmmf: DMMF.Document,
  config: { outputFile: string; esm?: boolean } & GQLoomGeneratorConfig
) {
  const lines: string[] = []

  if (config.esm) {
    lines.push(
      `import { PrismaWeaver } from "${config.gqloomPath ?? "@gqloom/prisma"}"`
    )
  } else {
    lines.push(
      `const { PrismaWeaver } = require("${config.gqloomPath ?? "@gqloom/prisma"}")`
    )
  }

  if (config.esm) {
    lines.push(`import datamodel from "./datamodel.json"`)
  } else {
    lines.push(`const datamodel = require("./datamodel.json")`)
  }
  lines.push("\n")
  for (const model of dmmf.datamodel.models) {
    lines.push(
      `const ${model.name} = PrismaWeaver.unravel(datamodel.models.${model.name})`
    )
  }

  // export silks
  lines.push("\n")
  if (config.esm) lines.push("export {")
  else lines.push("module.exports = {")

  for (const model of dmmf.datamodel.models) {
    lines.push(`  ${model.name},`)
  }
  lines.push("}")

  await fs.writeFile(config.outputFile, lines.join("\n"))
}
