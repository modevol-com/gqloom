import { generatorHandler } from "@prisma/generator-helper"
import * as path from "path"
import * as fs from "fs"
import { genTsDeclaration } from "./ts"
import { genJSFile } from "./js"

const defaultOutput = path.resolve(findPackageRoot(), "./generated")

export interface GQLoomGeneratorConfig {
  /**
   * Path to the GQLoom package.
   * @default "@gqloom/prisma"
   */
  gqloomPath?: string

  /**
   * Path to the Prisma client.
   * @default "./node_modules/@prisma/client"
   */
  clientOutput?: string

  /**
   * Folder path to the generated files.
   * @default "./node_modules/@gqloom/prisma/generated"
   */
  output?: string

  /**
   * File name for the CommonJS file. Use "" to disable.
   * @default "index.cjs"
   */
  commonjsFile?: string

  /**
   * File name for the ES module file. Use "" to disable.
   * @default "index.js"
   */
  moduleFile?: string

  /**
   * File names for the TypeScript declaration files. Use [] to disable.
   * @default ["index.d.ts"]
   */
  typesFiles?: string[]
}

generatorHandler({
  onManifest: () => ({
    prettyName: "GQLoom integration",
    requiresGenerators: ["prisma-client-js"],
    defaultOutput,
  }),
  onGenerate: async (options) => {
    const config = options.generator.config as GQLoomGeneratorConfig

    config.commonjsFile ??= "index.cjs"
    config.moduleFile ??= "index.js"
    config.typesFiles ??= ["index.d.ts"]

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
      path.resolve(outputDir, "./model-meta.json"),
      JSON.stringify({ models, enums, schema }, null, 2)
    )
    if (config.commonjsFile) {
      await genJSFile(options.dmmf, {
        outputFile: path.resolve(outputDir, config.commonjsFile),
        esm: false,
        ...config,
      })
    }
    if (config.moduleFile) {
      await genJSFile(options.dmmf, {
        outputFile: path.resolve(outputDir, config.moduleFile),
        esm: true,
        ...config,
      })
    }

    for (const file of config.typesFiles) {
      await genTsDeclaration(options.dmmf, {
        outputFile: path.resolve(outputDir, file),
        prismaLocation,
        ...config,
      })
    }
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
