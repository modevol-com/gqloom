import { type DMMF } from "@prisma/generator-helper"
import { type GQLoomGeneratorConfig } from "."
import * as path from "path"
import * as fs from "fs/promises"

export async function genJSFile(
  dmmf: DMMF.Document,
  config: { outputDir: string } & GQLoomGeneratorConfig
) {
  const lines: string[] = []

  lines.push(
    `const { PrismaWeaver } = require("${config.gqloomPath ?? "@gqloom/prisma"}")`
  )

  lines.push(`const datamodel = require("./datamodel.json")`)
  lines.push("\n")
  for (const model of dmmf.datamodel.models) {
    lines.push(
      `const ${model.name}Silk = PrismaWeaver.unravel(datamodel.models.${model.name})`
    )
  }

  // export silks
  lines.push("\n")
  lines.push("module.exports = {")
  for (const model of dmmf.datamodel.models) {
    lines.push(`  ${model.name}Silk,`)
  }
  lines.push("}")

  await fs.writeFile(
    path.resolve(config.outputDir, "./index.js"),
    lines.join("\n")
  )
}
