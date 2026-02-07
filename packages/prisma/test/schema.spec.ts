import { type GraphQLSilk, getGraphQLType, weave } from "@gqloom/core"
import { ZodWeaver } from "@gqloom/zod"
import type { DMMF } from "@prisma/generator-helper"
import {
  type GraphQLNamedType,
  GraphQLNonNull,
  GraphQLScalarType,
  GraphQLString,
  printSchema,
  printType,
} from "graphql"
import { describe, expect, it } from "vitest"
import * as z from "zod"
import { PrismaWeaver } from "../src"

const UserModel: DMMF.Model = {
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
    {
      name: "name",
      kind: "scalar",
      isList: false,
      isRequired: false,
      isUnique: false,
      isId: false,
      isReadOnly: false,
      hasDefaultValue: false,
      type: "String",
      isGenerated: false,
      isUpdatedAt: false,
    },
    {
      name: "createdAt",
      kind: "scalar",
      isList: false,
      isRequired: true,
      isUnique: false,
      isId: false,
      isReadOnly: false,
      hasDefaultValue: true,
      type: "DateTime",
      default: {
        name: "now",
        args: [],
      },
      isGenerated: false,
      isUpdatedAt: false,
    },
    {
      name: "posts",
      kind: "object",
      isList: true,
      isRequired: true,
      isUnique: false,
      isId: false,
      isReadOnly: false,
      hasDefaultValue: false,
      type: "Post",
      relationName: "PostToUser",
      relationFromFields: [],
      relationToFields: [],
      isGenerated: false,
      isUpdatedAt: false,
    },
  ],
  primaryKey: null,
  uniqueFields: [],
  uniqueIndexes: [],
  isGenerated: false,
}

const UserWithRoleModel: DMMF.Model = {
  ...UserModel,
  fields: [
    ...UserModel.fields,
    {
      name: "role",
      kind: "enum",
      isList: false,
      isRequired: true,
      isUnique: false,
      isId: false,
      isReadOnly: false,
      hasDefaultValue: true,
      type: "Role",
      default: "USER",
      isGenerated: false,
      isUpdatedAt: false,
    },
  ],
}

const RoleEnum: DMMF.DatamodelEnum = {
  name: "Role",
  values: [
    {
      name: "USER",
      dbName: null,
    },
    {
      name: "ADMIN",
      dbName: null,
    },
  ],
  dbName: null,
}

describe("PrismaWeaver", () => {
  it("should unravel model silk", () => {
    const UserSilk = PrismaWeaver.unravel(UserModel, {
      models: { User: UserModel },
      enums: { Role: RoleEnum },
      schema: {} as any,
    })
    expect(printSilk(UserSilk)).toMatchInlineSnapshot(`
      "type User {
        id: ID!

        """user's email is unique"""
        email: String!
        name: String
        createdAt: String!
      }"
    `)
  })
  it("should unravel enum silk", () => {
    const RoleSilk = PrismaWeaver.unravelEnum(RoleEnum)
    expect(printSilk(RoleSilk)).toMatchInlineSnapshot(`
      "enum Role {
        USER
        ADMIN
      }"
    `)
  })

  it("should unravel model with enum silk", () => {
    const UserWithRoleSilk = PrismaWeaver.unravel(UserWithRoleModel, {
      enums: { Role: RoleEnum },
      models: {},
      schema: {} as any,
    })

    expect(printSilk(UserWithRoleSilk)).toMatchInlineSnapshot(`
      "type User {
        id: ID!

        """user's email is unique"""
        email: String!
        name: String
        createdAt: String!
        role: Role!
      }"
    `)
  })

  it("should weave model with config", () => {
    interface IUser {
      id: number
      email: string
      name: string
      createdAt: Date
    }
    const UserSilk = PrismaWeaver.unravel<IUser>(UserModel, {
      models: { User: UserModel },
      enums: { Role: RoleEnum },
      schema: {} as any,
    })

    const Uid = new GraphQLScalarType<number, string>({ name: "UID" })

    const schema = weave(
      UserSilk,
      UserSilk.config({
        fields: { id: { type: Uid, description: "user's id" } },
      })
    )

    const schema2 = weave(
      UserSilk,
      UserSilk.config({
        fields: { id: Uid },
      })
    )

    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type User {
        """user's id"""
        id: UID!

        """user's email is unique"""
        email: String!
        name: String
        createdAt: String!
      }

      scalar UID"
    `)

    expect(printSchema(schema2)).toMatchInlineSnapshot(`
      "type User {
        id: UID!

        """user's email is unique"""
        email: String!
        name: String
        createdAt: String!
      }

      scalar UID"
    `)
  })

  it("should emit id as Int when emitIdAsIDType is false", () => {
    const UserSilk = PrismaWeaver.unravel(UserModel, {
      models: { User: UserModel },
      enums: { Role: RoleEnum },
      schema: {} as any,
    })
    const schema = weave(
      PrismaWeaver.config({ emitIdAsIDType: false }),
      UserSilk
    )
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type User {
        id: Int!

        """user's email is unique"""
        email: String!
        name: String
        createdAt: String!
      }"
    `)
  })

  it("should weave model with config and zod type", () => {
    interface IUser {
      id: number
      email: string
      name: string
      createdAt: Date
    }
    const UserSilk = PrismaWeaver.unravel<IUser>(UserModel, {
      models: { User: UserModel },
      enums: { Role: RoleEnum },
      schema: {} as any,
    })

    const GraphQLDateTime = new GraphQLScalarType<Date, string>({
      name: "DateTime",
    })

    const zodConfig = ZodWeaver.config({
      presetGraphQLType: (schema) => {
        if (schema instanceof z.ZodDate) return GraphQLDateTime
      },
    })

    const schema = weave(
      UserSilk,
      UserSilk.config({
        fields: { createdAt: { type: z.date() } },
      }),
      zodConfig
    )

    const schema2 = weave(
      UserSilk,
      UserSilk.config({
        fields: { createdAt: z.date() },
      }),
      zodConfig
    )

    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type User {
        id: ID!

        """user's email is unique"""
        email: String!
        name: String
        createdAt: DateTime!
      }

      scalar DateTime"
    `)

    expect(printSchema(schema2)).toEqual(printSchema(schema))
  })

  it("aligns output nullability with Model: required field with nullable Silk becomes NonNull", () => {
    const UserSilk = PrismaWeaver.unravel(UserModel, {
      models: { User: UserModel },
      enums: { Role: RoleEnum },
      schema: {} as any,
    })
    const schema = weave(
      UserSilk,
      UserSilk.config({
        fields: { email: GraphQLString },
      })
    )
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type User {
        id: ID!

        """user's email is unique"""
        email: String!
        name: String
        createdAt: String!
      }"
    `)
  })

  it("aligns output nullability with Model: optional field with NonNull custom type becomes nullable", () => {
    const UserSilk = PrismaWeaver.unravel(UserModel, {
      models: { User: UserModel },
      enums: { Role: RoleEnum },
      schema: {} as any,
    })
    const CustomName = new GraphQLNonNull(
      new GraphQLScalarType({ name: "CustomName" })
    )
    const schema = weave(
      UserSilk,
      UserSilk.config({
        fields: { name: { type: CustomName } },
      })
    )
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type User {
        id: ID!

        """user's email is unique"""
        email: String!
        name: CustomName
        createdAt: String!
      }

      scalar CustomName"
    `)
  })

  describe("PrismaModelSilk validate (compileValidator)", () => {
    it("returns value as-is when no config is set", async () => {
      const UserSilk = PrismaWeaver.unravel(UserModel, {
        models: { User: UserModel },
        enums: { Role: RoleEnum },
        schema: {} as any,
      })
      const value = { id: 1, email: "a@b.com", name: "x" }
      const result = await UserSilk["~standard"].validate(value)
      expect(result).toEqual({ value })
    })

    it("returns value as-is when config.fields is empty", async () => {
      const UserSilk = PrismaWeaver.unravel(UserModel, {
        models: { User: UserModel },
        enums: { Role: RoleEnum },
        schema: {} as any,
      })
      UserSilk.config({ fields: {} })
      const value = { id: 1, email: "a@b.com", name: "x" }
      const result = await UserSilk["~standard"].validate(value)
      expect(result).toEqual({ value })
    })

    it("validates fields with Silk from config and returns merged value", async () => {
      const UserSilk = PrismaWeaver.unravel(UserModel, {
        models: { User: UserModel },
        enums: { Role: RoleEnum },
        schema: {} as any,
      })
      UserSilk.config({
        fields: {
          name: z.string().min(1),
        },
      })
      const result = await UserSilk["~standard"].validate({
        id: 1,
        email: "a@b.com",
        name: "ok",
      })
      expect(result).toEqual({
        value: { id: 1, email: "a@b.com", name: "ok" },
      })
    })

    it("returns issues with path prefixed when Silk validation fails", async () => {
      const UserSilk = PrismaWeaver.unravel(UserModel, {
        models: { User: UserModel },
        enums: { Role: RoleEnum },
        schema: {} as any,
      })
      UserSilk.config({
        fields: {
          name: z.string().min(2),
          email: z.email(),
        },
      })
      const result = await UserSilk["~standard"].validate({
        id: 1,
        name: "x",
        email: "invalid-email",
      })
      expect(result).toHaveProperty("issues")
      expect(result.issues).toHaveLength(2)
      const nameIssue = result.issues!.find((issue) =>
        issue.path?.includes("name")
      )
      expect(nameIssue?.message).toMatchInlineSnapshot(
        `"Too small: expected string to have >=2 characters"`
      )
      const emailIssue = result.issues!.find((issue) =>
        issue.path?.includes("email")
      )
      expect(emailIssue?.message).toMatchInlineSnapshot(
        `"Invalid email address"`
      )
    })

    it("validates multiple fields with Silks from config", async () => {
      const UserSilk = PrismaWeaver.unravel(UserModel, {
        models: { User: UserModel },
        enums: { Role: RoleEnum },
        schema: {} as any,
      })
      UserSilk.config({
        fields: {
          name: z.string().min(1),
          email: z.email(),
        },
      })
      const result = await (UserSilk as any)["~standard"].validate({
        id: 1,
        email: "valid@example.com",
        name: "alice",
      })
      expect(result).toEqual({
        value: { id: 1, email: "valid@example.com", name: "alice" },
      })
    })

    it("skips validation for keys not present in value", async () => {
      const UserSilk = PrismaWeaver.unravel(UserModel, {
        models: { User: UserModel },
        enums: { Role: RoleEnum },
        schema: {} as any,
      })
      const nameSilk = ZodWeaver.unravel(z.string().min(1))
      UserSilk.config({ fields: { name: nameSilk } })
      const result = await UserSilk["~standard"].validate({
        id: 1,
        email: "a@b.com",
      })
      expect(result).toEqual({ value: { id: 1, email: "a@b.com" } })
    })

    it("uses config.fields when it is a getter function", async () => {
      const UserSilk = PrismaWeaver.unravel(UserModel, {
        models: { User: UserModel },
        enums: { Role: RoleEnum },
        schema: {} as any,
      })
      const nameSilk = ZodWeaver.unravel(z.string().min(1))
      UserSilk.config({
        fields: () => ({ name: nameSilk }),
      })
      const result = await UserSilk["~standard"].validate({
        id: 1,
        email: "a@b.com",
        name: "ok",
      })
      expect(result).toEqual({
        value: { id: 1, email: "a@b.com", name: "ok" },
      })
    })

    it("extracts validator from field config with type getter", async () => {
      const UserSilk = PrismaWeaver.unravel(UserModel, {
        models: { User: UserModel },
        enums: { Role: RoleEnum },
        schema: {} as any,
      })
      const nameSilk = ZodWeaver.unravel(z.string().min(2))
      UserSilk.config({
        fields: {
          name: { type: () => nameSilk },
        },
      })
      const result = await UserSilk["~standard"].validate({
        id: 1,
        email: "a@b.com",
        name: "x",
      })
      expect(result).toHaveProperty("issues")
      expect(result.issues!.length).toBeGreaterThanOrEqual(1)
      expect(result.issues!.some((i) => i.path?.includes("name"))).toBe(true)
    })
  })

  it("throws for unsupported scalar type when no preset", () => {
    const ModelWithJson: DMMF.Model = {
      name: "Item",
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
          hasDefaultValue: false,
          type: "Int",
          isGenerated: false,
          isUpdatedAt: false,
        },
        {
          name: "data",
          kind: "scalar",
          isList: false,
          isRequired: false,
          isUnique: false,
          isId: false,
          isReadOnly: false,
          hasDefaultValue: false,
          type: "Json",
          isGenerated: false,
          isUpdatedAt: false,
        },
      ],
      primaryKey: null,
      uniqueFields: [],
      uniqueIndexes: [],
      isGenerated: false,
    }
    const ItemSilk = PrismaWeaver.unravel(ModelWithJson, {
      models: { Item: ModelWithJson },
      enums: {},
      schema: {} as any,
    })
    expect(() => weave(ItemSilk)).toThrow("Unsupported scalar type: Json")
  })
})

function printSilk(silk: GraphQLSilk) {
  const type = getGraphQLType(silk) as GraphQLNonNull<GraphQLNamedType>
  return type instanceof GraphQLNonNull
    ? printType(type.ofType)
    : printType(type)
}
