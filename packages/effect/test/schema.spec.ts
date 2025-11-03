import type { GQLoomExtensions, SchemaWeaver } from "@gqloom/core"
import { Schema } from "effect"
import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLString,
} from "graphql"
import { describe, expect, expectTypeOf, it } from "vitest"
import {
  asEnumType,
  asField,
  asObjectType,
  asUnionType,
  EffectWeaver,
} from "../src"

declare module "graphql" {
  export interface GraphQLObjectTypeExtensions extends GQLoomExtensions {}

  export interface GraphQLFieldExtensions<_TSource, _TContext, _TArgs = any>
    extends GQLoomExtensions {}
}

const GraphQLDate = new GraphQLScalarType<Date, string>({
  name: "Date",
})

const getGraphQLType = EffectWeaver.getGraphQLType

describe("EffectWeaver", () => {
  it("should satisfy SchemaWeaver", () => {
    expectTypeOf(EffectWeaver).toMatchTypeOf<SchemaWeaver>()
  })

  it("should handle scalar types", () => {
    expect(getGraphQLType(Schema.NullOr(Schema.String))).toEqual(GraphQLString)

    expect(getGraphQLType(Schema.NullOr(Schema.Number))).toEqual(GraphQLFloat)

    expect(
      getGraphQLType(
        Schema.NullOr(Schema.Int.annotations({ identifier: "Int" }))
      )
    ).toEqual(GraphQLInt)

    expect(getGraphQLType(Schema.NullOr(Schema.Boolean))).toEqual(
      GraphQLBoolean
    )

    expect(
      getGraphQLType(
        Schema.NullOr(Schema.Date.annotations({ identifier: "Date" }))
      )
    ).toEqual(GraphQLString)

    expect(
      getGraphQLType(
        Schema.NullOr(Schema.String.annotations({ identifier: "UUID" }))
      )
    ).toEqual(GraphQLID)

    expect(
      getGraphQLType(
        Schema.NullOr(Schema.String.annotations({ identifier: "ULID" }))
      )
    ).toEqual(GraphQLID)
  })

  it("should handle literal types", () => {
    expect(getGraphQLType(Schema.NullOr(Schema.Literal("")))).toEqual(
      GraphQLString
    )
    expect(getGraphQLType(Schema.NullOr(Schema.Literal(0)))).toEqual(
      GraphQLFloat
    )
    expect(getGraphQLType(Schema.NullOr(Schema.Literal(false)))).toEqual(
      GraphQLBoolean
    )
  })

  it("should handle custom type", () => {
    const DateSchema = asField(
      Schema.Date.annotations({ identifier: "Date" }),
      { type: GraphQLDate }
    )

    expect(getGraphQLType(DateSchema)).toEqual(GraphQLDate)
  })

  it("should handle non-null types", () => {
    expect(getGraphQLType(Schema.String)).toEqual(
      new GraphQLNonNull(GraphQLString)
    )
    expect(getGraphQLType(Schema.NullOr(Schema.String))).toEqual(GraphQLString)
    expect(
      getGraphQLType(Schema.Union(Schema.String, Schema.Undefined))
    ).toEqual(GraphQLString)
    expect(
      getGraphQLType(Schema.Union(Schema.String, Schema.Undefined, Schema.Void))
    ).toEqual(GraphQLString)
  })

  it("should handle array types", () => {
    expect(getGraphQLType(Schema.Array(Schema.String))).toEqual(
      new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString)))
    )

    expect(getGraphQLType(Schema.Array(Schema.NullOr(Schema.String)))).toEqual(
      new GraphQLNonNull(new GraphQLList(GraphQLString))
    )
  })

  it("should handle object types", () => {
    const User = Schema.Struct({
      name: Schema.String,
      age: Schema.Number,
    })

    const type = getGraphQLType(User)
    expect(type).toBeInstanceOf(GraphQLNonNull)
    expect((type as GraphQLNonNull<any>).ofType).toBeInstanceOf(
      GraphQLObjectType
    )
  })

  it("should handle enum types", () => {
    const Role = Schema.Enums({
      Admin: "ADMIN",
      User: "USER",
      Guest: "GUEST",
    })

    const type = getGraphQLType(Role)
    expect(type).toBeInstanceOf(GraphQLNonNull)
  })

  it("should handle union types", () => {
    const Cat = Schema.Struct({
      __typename: Schema.Literal("Cat"),
      meow: Schema.String,
    })

    const Dog = Schema.Struct({
      __typename: Schema.Literal("Dog"),
      bark: Schema.String,
    })

    const Animal = Schema.Union(Cat, Dog)

    const type = getGraphQLType(Animal)
    expect(type).toBeInstanceOf(GraphQLNonNull)
  })

  it("should handle nullable union types", () => {
    const Cat = Schema.Struct({
      __typename: Schema.Literal("Cat"),
      meow: Schema.String,
    })

    const Dog = Schema.Struct({
      __typename: Schema.Literal("Dog"),
      bark: Schema.String,
    })

    const Animal = Schema.NullOr(Schema.Union(Cat, Dog))

    const type = getGraphQLType(Animal)
    expect(type).not.toBeInstanceOf(GraphQLNonNull)
  })

  it("should handle nested structures", () => {
    const Address = Schema.Struct({
      street: Schema.String,
      city: Schema.String,
    })

    const User = Schema.Struct({
      name: Schema.String,
      address: Address,
    })

    const type = getGraphQLType(User) as GraphQLNonNull<GraphQLObjectType>
    expect(type.ofType).toBeInstanceOf(GraphQLObjectType)

    const fields = type.ofType.getFields()
    expect(fields.address.type).toBeInstanceOf(GraphQLNonNull)
    expect((fields.address.type as GraphQLNonNull<any>).ofType).toBeInstanceOf(
      GraphQLObjectType
    )
  })

  it("should handle with object metadata", () => {
    const User = asObjectType(
      Schema.Struct({
        id: Schema.String,
        name: Schema.String,
      }),
      {
        name: "CustomUser",
        description: "A custom user type",
      }
    )

    const type = getGraphQLType(User) as GraphQLNonNull<GraphQLObjectType>
    expect(type.ofType.name).toBe("CustomUser")
    expect(type.ofType.description).toBe("A custom user type")
  })

  it("should handle with field metadata", () => {
    const User = Schema.Struct({
      id: Schema.String,
      name: asField(Schema.String, {
        description: "The user's name",
      }),
    })

    const type = getGraphQLType(User) as GraphQLNonNull<GraphQLObjectType>
    const fields = type.ofType.getFields()
    expect(fields.name.description).toBe("The user's name")
  })

  it("should handle with enum metadata", () => {
    const Role = asEnumType(
      Schema.Enums({
        Admin: "ADMIN",
        User: "USER",
      }),
      {
        name: "UserRole",
        description: "User role in the system",
      }
    )

    const type = getGraphQLType(Role) as GraphQLNonNull<any>
    expect(type.ofType.name).toBe("UserRole")
    expect(type.ofType.description).toBe("User role in the system")
  })

  it("should handle with union metadata", () => {
    const Cat = Schema.Struct({
      __typename: Schema.Literal("Cat"),
      meow: Schema.String,
    })

    const Dog = Schema.Struct({
      __typename: Schema.Literal("Dog"),
      bark: Schema.String,
    })

    const Animal = asUnionType(Schema.Union(Cat, Dog), {
      name: "Animal",
      description: "An animal union type",
    })

    const type = getGraphQLType(Animal) as GraphQLNonNull<any>
    expect(type.ofType.name).toBe("Animal")
    expect(type.ofType.description).toBe("An animal union type")
  })
})
