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
})

function printSilk(silk: GraphQLSilk) {
  const type = getGraphQLType(silk) as GraphQLNonNull<GraphQLNamedType>
  return type instanceof GraphQLNonNull
    ? printType(type.ofType)
    : printType(type)
}
