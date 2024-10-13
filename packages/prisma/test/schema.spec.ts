import { type DMMF } from "@prisma/generator-helper"
import { describe, it, expect } from "vitest"
import { printType, GraphQLNonNull, type GraphQLNamedType } from "graphql"
import { PrismaWeaver } from "../src"
import { getGraphQLType, type GraphQLSilk } from "@gqloom/core"

const UserModel: DMMF.Model = {
  name: "User",
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
})

function printSilk(silk: GraphQLSilk) {
  const type = getGraphQLType(silk) as GraphQLNonNull<GraphQLNamedType>
  return type instanceof GraphQLNonNull
    ? printType(type.ofType)
    : printType(type)
}
