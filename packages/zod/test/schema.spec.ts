import { describe, expect, it } from "vitest"
import { objectType, query, resolver, zodSilk } from "../src"
import { type Schema, z } from "zod"
import {
  GraphQLID,
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLNonNull,
  GraphQLList,
  GraphQLObjectType,
  printType,
  type GraphQLNamedType,
  printSchema,
} from "graphql"
import { SchemaWeaver, type SilkResolver } from "@gqloom/core"
import { resolveTypeByDiscriminatedUnion } from "../src/utils"

describe("ZodSilk", () => {
  it("should handle scalar", () => {
    expect(zodSilk(z.string().nullable()).getGraphQLType()).toEqual(
      GraphQLString
    )
    expect(zodSilk(z.number().nullable()).getGraphQLType()).toEqual(
      GraphQLFloat
    )
    expect(zodSilk(z.number().int().nullable()).getGraphQLType()).toEqual(
      GraphQLInt
    )
    expect(zodSilk(z.boolean().nullable()).getGraphQLType()).toEqual(
      GraphQLBoolean
    )
    expect(zodSilk(z.date().nullable()).getGraphQLType()).toEqual(GraphQLString)

    expect(zodSilk(z.string().cuid().nullable()).getGraphQLType()).toEqual(
      GraphQLID
    )
    expect(zodSilk(z.string().cuid2().nullable()).getGraphQLType()).toEqual(
      GraphQLID
    )
    expect(zodSilk(z.string().ulid().nullable()).getGraphQLType()).toEqual(
      GraphQLID
    )
    expect(zodSilk(z.string().uuid().nullable()).getGraphQLType()).toEqual(
      GraphQLID
    )

    expect(zodSilk(z.string().email().nullable()).getGraphQLType()).toEqual(
      GraphQLString
    )
  })
  it("should handle non null", () => {
    expect(zodSilk(z.string()).getGraphQLType()).toEqual(
      new GraphQLNonNull(GraphQLString)
    )
    expect(zodSilk(z.string().nullable()).getGraphQLType()).toEqual(
      GraphQLString
    )
    expect(zodSilk(z.string().optional()).getGraphQLType()).toEqual(
      GraphQLString
    )
    expect(zodSilk(z.string().nullish()).getGraphQLType()).toEqual(
      GraphQLString
    )
  })
  it("should handle array", () => {
    expect(zodSilk(z.array(z.string())).getGraphQLType()).toEqual(
      new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString)))
    )
    expect(zodSilk(z.string().array()).getGraphQLType()).toEqual(
      new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString)))
    )

    expect(zodSilk(z.array(z.string()).optional()).getGraphQLType()).toEqual(
      new GraphQLList(new GraphQLNonNull(GraphQLString))
    )

    expect(zodSilk(z.array(z.string().nullable())).getGraphQLType()).toEqual(
      new GraphQLNonNull(new GraphQLList(GraphQLString))
    )

    expect(
      zodSilk(z.array(z.string().nullable()).nullable()).getGraphQLType()
    ).toEqual(new GraphQLList(GraphQLString))
  })
  it("should handle object", () => {
    const Cat = z
      .object({
        name: z.string(),
        age: z.number(),
        loveFish: z.boolean().optional(),
      })
      .describe("Cat")

    expect(
      (zodSilk(Cat).getGraphQLType() as GraphQLNonNull<any>).ofType
    ).toBeInstanceOf(GraphQLObjectType)

    expect(printZodSilk(Cat)).toMatchInlineSnapshot(`
      "type Cat {
        name: String!
        age: Float!
        loveFish: Boolean
      }"
    `)
  })

  it("should handle enum", () => {
    const fruitZ = z
      .enum(["apple", "banana", "orange"])
      .describe("Fruit: Some fruits you might like")
    enum Fruit {
      apple,
      banana,
      orange,
    }
    const fruitN = z
      .nativeEnum(Fruit)
      .describe("Fruit: Some fruits you might like")

    expect(printZodSilk(fruitN)).toEqual(printZodSilk(fruitZ))

    expect(printZodSilk(fruitZ)).toMatchInlineSnapshot(`
      """"Some fruits you might like"""
      enum Fruit {
        apple
        banana
        orange
      }"
    `)
  })

  it("should handle interfere", () => {
    const Fruit = z
      .object({
        name: z.string(),
        color: z.string(),
        prize: z.number(),
      })
      .describe("Fruit: Some fruits you might like")

    const Orange = objectType(
      { name: "Origin", interfaces: [Fruit] },
      z.object({
        name: z.string(),
        color: z.string(),
        prize: z.number(),
      })
    )

    const r = resolver({
      orange: query(Orange, () => 0 as any),
    })

    expect(printResolver(r)).toMatchInlineSnapshot(`
      "type Query {
        orange: Origin!
      }

      type Origin implements Fruit {
        name: String!
        color: String!
        prize: Float!
      }

      """Some fruits you might like"""
      interface Fruit {
        name: String!
        color: String!
        prize: Float!
      }"
    `)
  })

  it("should handle union", () => {
    const Cat = z
      .object({
        name: z.string(),
        age: z.number(),
        loveFish: z.boolean().optional(),
      })
      .describe("Cat")

    const Dog = z
      .object({
        name: z.string(),
        age: z.number(),
        loveBone: z.boolean().optional(),
      })
      .describe("Dog")

    const Animal = z.union([Cat, Dog]).describe("Animal")
    const r = resolver({
      animal: query(Animal, () => 0 as any),
    })

    expect(printResolver(r)).toMatchInlineSnapshot(`
      "type Query {
        animal: Animal!
      }

      union Animal = Cat | Dog

      type Cat {
        name: String!
        age: Float!
        loveFish: Boolean
      }

      type Dog {
        name: String!
        age: Float!
        loveBone: Boolean
      }"
    `)
  })

  it("should handle discriminated union", () => {
    const Cat = z
      .object({
        __typename: z.literal("Cat"),
        name: z.string(),
        age: z.number(),
        loveFish: z.boolean().optional(),
      })
      .describe("Cat")

    const Dog = z
      .object({
        __typename: z.literal("Dog"),
        name: z.string(),
        age: z.number(),
        loveBone: z.boolean().optional(),
      })
      .describe("Dog")

    const Animal = z
      .discriminatedUnion("__typename", [Cat, Dog])
      .describe("Animal")

    const r = resolver({
      animal: query(Animal, () => 0 as any),
    })

    expect(printResolver(r)).toMatchInlineSnapshot(`
      "type Query {
        animal: Animal!
      }

      union Animal = Cat | Dog

      type Cat {
        __typename: String!
        name: String!
        age: Float!
        loveFish: Boolean
      }

      type Dog {
        __typename: String!
        name: String!
        age: Float!
        loveBone: Boolean
      }"
    `)

    const resolveTypeBase = resolveTypeByDiscriminatedUnion(Animal)
    const resolveType = (data: z.infer<typeof Animal>) =>
      resolveTypeBase(data, {} as any, {} as any, {} as any)
    expect(resolveType({ __typename: "Cat", name: "", age: 6 })).toEqual("Cat")
    expect(resolveType({ __typename: "Dog", name: "", age: 6 })).toEqual("Dog")
  })

  describe.todo("should avoid duplicate", () => {
    it.todo("should merge field from multiple resolver")
    it.todo("should avoid duplicate object")
    it.todo("should avoid duplicate input")
    it.todo("should avoid duplicate enum")
    it.todo("should avoid duplicate interface")
    it.todo("should avoid duplicate union")
  })
})

function printZodSilk(schema: Schema): string {
  let gqlType = zodSilk(schema).getGraphQLType()
  while ("ofType" in gqlType) gqlType = gqlType.ofType
  return printType(gqlType as GraphQLNamedType)
}

function printResolver(...resolvers: SilkResolver[]): string {
  const weaver = new SchemaWeaver()
  for (const r of resolvers) weaver.add(r)

  const schema = weaver.weaveGraphQLSchema()
  return printSchema(schema)
}
