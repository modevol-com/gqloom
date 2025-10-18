import type { DMMF } from "@prisma/generator-helper"
import { describe, expect, it } from "vitest"
import { genJSFile } from "../src/generator/js"
import { genTsDeclaration } from "../src/generator/ts"

// 模拟 DMMF.Document 数据
const mockDMMF: DMMF.Document = {
  datamodel: {
    models: [
      {
        name: "User",
        schema: null,
        dbName: null,
        fields: [
          {
            name: "id",
            kind: "scalar",
            isList: false,
            isRequired: true,
            isUnique: false,
            isId: true,
            isReadOnly: false,
            hasDefaultValue: true,
            type: "Int",
            default: {
              name: "autoincrement",
              args: [],
            },
            isGenerated: false,
            isUpdatedAt: false,
          },
          {
            name: "email",
            kind: "scalar",
            isList: false,
            isRequired: true,
            isUnique: true,
            isId: false,
            isReadOnly: false,
            hasDefaultValue: false,
            type: "String",
            isGenerated: false,
            isUpdatedAt: false,
            documentation: "user's email is unique",
          },
        ],
        primaryKey: null,
        uniqueFields: [],
        uniqueIndexes: [],
        isGenerated: false,
      },
    ],
    enums: [
      {
        name: "Role",
        values: [
          { name: "USER", dbName: null },
          { name: "ADMIN", dbName: null },
        ],
      },
    ],
    types: [],
    indexes: [],
  },
  schema: {} as any,
  mappings: {} as any,
}

describe("generator", () => {
  describe("generate JS code correctly", () => {
    it("should generate ESM code correctly", () => {
      const config = {
        outputFile: "output.js",
        esm: true,
        gqloomPath: "@gqloom/prisma",
      }
      const result = genJSFile(mockDMMF, config)
      expect(result).toMatchInlineSnapshot(`
        "import { PrismaWeaver } from "@gqloom/prisma"
        import mm from "./model-meta.json" with { type: "json" }

        const User = PrismaWeaver.unravel(mm.models.User, mm)

        const Role = PrismaWeaver.unravelEnum(mm.enums.Role)

        export {
          User,
          Role,
        }"
      `)
    })

    it("should generate CommonJS code correctly", () => {
      const config = {
        outputFile: "output.js",
        esm: false,
        gqloomPath: "@gqloom/prisma",
      }
      const result = genJSFile(mockDMMF, config)
      expect(result).toMatchInlineSnapshot(`
        "const { PrismaWeaver } = require("@gqloom/prisma")
        const mm = require("./model-meta.json")

        const User = PrismaWeaver.unravel(mm.models.User, mm)

        const Role = PrismaWeaver.unravelEnum(mm.enums.Role)

        module.exports = {
          User,
          Role,
        }"
      `)
    })
  })

  describe("generate TS code correctly", () => {
    it("should generate TS code correctly", () => {
      const config = {
        outputFile: "output.ts",
        prismaLocation: "@prisma/client",
      }
      const result = genTsDeclaration(mockDMMF, config)
      expect(result).toMatchInlineSnapshot(`
        "import type { PrismaModelSilk, PrismaEnumSilk } from "@gqloom/prisma";
        import type { User as IUser, Role as IRole, Prisma } from "@prisma/client";

        export const User: PrismaModelSilk<IUser, "user">;
        export const Role: PrismaEnumSilk<IRole>;

        declare module "@gqloom/prisma" {
          interface PrismaTypes {
          }
        }

        export { IUser, IRole };
        "
      `)
    })
  })
})
