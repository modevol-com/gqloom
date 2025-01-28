import type { DMMF } from "@prisma/generator-helper"
import type { GQLoomGeneratorConfig } from "."

export function genJSFile(
  dmmf: DMMF.Document,
  config: { outputFile: string; esm?: boolean } & GQLoomGeneratorConfig
): string {
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
    lines.push(`import mm from "./model-meta.json"`)
  } else {
    lines.push(`const mm = require("./model-meta.json")`)
  }
  lines.push("")
  for (const model of dmmf.datamodel.models) {
    lines.push(
      `const ${model.name} = PrismaWeaver.unravel(mm.models.${model.name}, mm)`
    )
  }

  lines.push("")

  for (const enumType of dmmf.datamodel.enums) {
    lines.push(
      `const ${enumType.name} = PrismaWeaver.unravelEnum(mm.enums.${enumType.name})`
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

  return lines.join("\n")
}
