import { Project, VariableDeclarationKind } from "ts-morph"
import * as path from "path"
import { type GQLoomGeneratorConfig } from "."
import { type DMMF } from "@prisma/generator-helper"

export async function genTsDeclaration(
  dmmf: DMMF.Document,
  config: { outputDir: string; prismaLocation: string } & GQLoomGeneratorConfig
) {
  const project = new Project()

  const sourceFile = project.createSourceFile(
    path.resolve(config.outputDir, "./index.d.ts"),
    "",
    { overwrite: true }
  )

  sourceFile.addImportDeclaration({
    moduleSpecifier: config.gqloomPath ?? "@gqloom/prisma",
    namedImports: ["PrismaModelSilk"],
    isTypeOnly: true,
  })

  sourceFile.addImportDeclaration({
    moduleSpecifier: config.prismaLocation ?? "@prisma/client",
    namedImports: dmmf.datamodel.models.map((m) => m.name),
    isTypeOnly: true,
  })

  for (const model of dmmf.datamodel.models) {
    sourceFile.addVariableStatement({
      declarationKind: VariableDeclarationKind.Const,
      isExported: true,
      declarations: [
        {
          name: `${model.name}Silk`,
          type: `PrismaModelSilk<${model.name}>`,
        },
      ],
    })
  }

  await sourceFile.save()
}
