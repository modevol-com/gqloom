import { generatorHandler } from "@prisma/generator-helper"
import * as path from "path"
import * as fs from "fs"
import { genTsDeclaration } from "./ts"
import { genJSFile } from "./js"

const defaultOutput = path.resolve(findPackageRoot(), "./generated")

export interface GQLoomGeneratorConfig {
  gqloomPath?: string
  clientOutput?: string
  output?: string
}

generatorHandler({
  onManifest: () => ({
    prettyName: "GQLoom integration",
    requiresGenerators: ["prisma-client-js"],
    defaultOutput,
  }),
  onGenerate: async (options) => {
    const config = options.generator.config as GQLoomGeneratorConfig
    const prismaLocation =
      config.clientOutput ??
      options.otherGenerators.find(
        (gen) => gen.provider.value === "prisma-client-js"
      )!.output!.value!

    const models = Object.create(null)
    for (const model of options.dmmf.datamodel.models) {
      models[model.name] = model
    }

    const enums = Object.create(null)
    for (const enumType of options.dmmf.datamodel.enums) {
      enums[enumType.name] = enumType
    }

    const schema = options.dmmf.schema

    const outputDir = options.generator.output?.value ?? defaultOutput

    // create output directory if it doesn't exist
    fs.mkdirSync(outputDir, { recursive: true })

    fs.writeFileSync(
      path.resolve(outputDir, "./datamodel.json"),
      JSON.stringify({ models, enums, schema }, null, 2)
    )
    await genJSFile(options.dmmf, {
      outputFile: path.resolve(outputDir, "./index.js"),
      esm: true,
      ...config,
    })
    await genJSFile(options.dmmf, {
      outputFile: path.resolve(outputDir, "./index.cjs"),
      esm: false,
      ...config,
    })
    await genTsDeclaration(options.dmmf, {
      outputDir,
      prismaLocation,
      ...config,
    })
  },
})

function findPackageRoot(): string {
  let dir = __dirname
  let time = 5
  while (time > 0) {
    if (fs.existsSync(path.resolve(dir, "./package.json"))) {
      return dir
    }
    dir = path.resolve(dir, "../")
    time--
  }
  return dir
}
