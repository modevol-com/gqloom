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
  lines.push("")
  for (const model of dmmf.datamodel.models) {
    lines.push(
      `const ${model.name} = PrismaWeaver.unravel(datamodel.models.${model.name}, datamodel)`
    )
  }

  lines.push("")

  for (const enumType of dmmf.datamodel.enums) {
    lines.push(
      `const ${enumType.name} = PrismaWeaver.unravelEnum(datamodel.enums.${enumType.name})`
    )
  }

  // export silks
  lines.push("")
  if (config.esm) lines.push("export {")
  else lines.push("module.exports = {")

  for (const model of dmmf.datamodel.models) {
    lines.push(`  ${model.name},`)
  }
  for (const enumType of dmmf.datamodel.enums) {
    lines.push(`  ${enumType.name},`)
  }
  lines.push("}")

  await fs.writeFile(config.outputFile, lines.join("\n"))
}
