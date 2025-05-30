import type { DMMF } from "@prisma/generator-helper"
import { Project, VariableDeclarationKind } from "ts-morph"
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

  sourceFile.addImportDeclaration({
    moduleSpecifier: config.prismaLocation ?? "@prisma/client",
    namedImports: [
      ...dmmf.datamodel.models.map((m) => ({
        name: m.name,
        alias: `I${m.name}`,
      })),
      ...dmmf.datamodel.enums.map((m) => ({
        name: m.name,
        alias: `I${m.name}`,
      })),
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
            .join(";") +
          "}"
        : ""
    sourceFile.addVariableStatement({
      declarationKind: VariableDeclarationKind.Const,
      isExported: true,
      declarations: [
        {
          name: `${model.name}`,
          type: `PrismaModelSilk<I${model.name}, "${lowerCase(model.name)}"${relationsGenerics}>`,
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
