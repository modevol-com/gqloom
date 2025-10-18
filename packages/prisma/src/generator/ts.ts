import type { DMMF } from "@prisma/generator-helper"
import * as path from "path"
import {
  ModuleDeclarationKind,
  Project,
  VariableDeclarationKind,
} from "ts-morph"
import type { GQLoomGeneratorConfig } from "."

export function genTsDeclaration(
  dmmf: DMMF.Document,
  config: { outputFile: string; prismaLocation: string } & GQLoomGeneratorConfig
): string {
  const project = new Project()

  const sourceFile = project.createSourceFile(config.outputFile, "", {
    overwrite: true,
  })

  sourceFile.addImportDeclaration({
    moduleSpecifier: config.gqloomPath ?? "@gqloom/prisma",
    namedImports: ["PrismaModelSilk", "PrismaEnumSilk"],
    isTypeOnly: true,
  })

  // Calculate relative path from output file to Prisma client location
  const outputDir = path.dirname(config.outputFile)
  let prismaClientPath = config.prismaLocation ?? "@prisma/client"

  // Convert absolute path to relative path
  if (path.isAbsolute(prismaClientPath)) {
    let relativePath = path.relative(outputDir, prismaClientPath)
    // Ensure the path starts with ./ or ../
    if (!relativePath.startsWith(".")) {
      relativePath = `./${relativePath}`
    }
    // Normalize path separators for cross-platform compatibility
    prismaClientPath = relativePath.split(path.sep).join("/")
  }

  sourceFile.addImportDeclaration({
    moduleSpecifier: prismaClientPath,
    namedImports: [
      ...dmmf.datamodel.models.map((m) => ({
        name: m.name,
        alias: `I${m.name}`,
      })),
      ...dmmf.datamodel.enums.map((m) => ({
        name: m.name,
        alias: `I${m.name}`,
      })),
      { name: "Prisma" },
    ],
    isTypeOnly: true,
  })

  for (const model of dmmf.datamodel.models) {
    const relations = model.fields.filter((f) => f.kind === "object")
    const relationsGenerics =
      relations.length > 0
        ? ", { " +
          relations
            .map((r) => {
              const list = r.isList ? "[]" : ""
              const optional = r.isRequired ? "" : "?"
              return `${r.name}${optional}: I${r.type}${list}`
            })
            .join("; ") +
          " }"
        : ""
    sourceFile.addVariableStatement({
      declarationKind: VariableDeclarationKind.Const,
      isExported: true,
      declarations: [
        {
          name: `${model.name}`,
          type: `PrismaModelSilk<I${model.name}, "${lowerCase(
            model.name
          )}"${relationsGenerics}>`,
        },
      ],
    })
  }
  for (const enumType of dmmf.datamodel.enums) {
    sourceFile.addVariableStatement({
      declarationKind: VariableDeclarationKind.Const,
      isExported: true,
      declarations: [
        {
          name: `${enumType.name}`,
          type: `PrismaEnumSilk<I${enumType.name}>`,
        },
      ],
    })
  }

  sourceFile.addModule({
    name: '"@gqloom/prisma"',
    hasDeclareKeyword: true,
    declarationKind: ModuleDeclarationKind.Module,
    statements: (writer) => {
      writer.write("interface PrismaInputTypes").block(() => {
        dmmf.schema.inputObjectTypes?.prisma?.forEach((p) => {
          writer.writeLine(`${p.name}: Prisma.${p.name}`)
        })
      })
    },
  })

  sourceFile.addExportDeclaration({
    namedExports: [
      ...dmmf.datamodel.models.map((m) => ({
        name: `I${m.name}`,
      })),
      ...dmmf.datamodel.enums.map((m) => ({
        name: `I${m.name}`,
      })),
    ],
  })

  return sourceFile.getFullText()
}

function lowerCase(string: string) {
  return string.charAt(0).toLowerCase() + string.slice(1)
}
