import {
  type GQLoomExtensions,
  GraphQLSchemaLoom,
  type Loom,
  type SchemaWeaver,
  collectNames,
} from "@gqloom/core"
import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  type GraphQLNamedType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLString,
  printSchema,
  printType,
} from "graphql"
import { describe, expect, expectTypeOf, it } from "vitest"
import * as z3 from "zod/v3"
import * as z from "zod/v4"
import {
  ZodWeaver,
  asEnumType,
  asField,
  asObjectType,
  asUnionType,
  field,
  query,
  resolver,
} from "../src"
import { resolveTypeByDiscriminatedUnion } from "../src/utils"

declare module "graphql" {
  export interface GraphQLObjectTypeExtensions extends GQLoomExtensions {}

  export interface GraphQLFieldExtensions<_TSource, _TContext, _TArgs = any>
    extends GQLoomExtensions {}
}

const GraphQLDate = new GraphQLScalarType<Date, string>({
  name: "Date",
})

const getGraphQLType = ZodWeaver.getGraphQLType

describe("ZodWeaver", () => {
  it("should satisfy SchemaVendorWeaver", () => {
    expectTypeOf(ZodWeaver).toMatchTypeOf<SchemaWeaver>()
  })

  it("should handle scalar", () => {
    expect(getGraphQLType(z.string().nullable())).toEqual(GraphQLString)

    expect(getGraphQLType(z.number().nullable())).toEqual(GraphQLFloat)

    expect(getGraphQLType(z.int().nullable())).toEqual(GraphQLInt)

    expect(getGraphQLType(z.boolean().default(false).nullable())).toEqual(
      GraphQLBoolean
    )

    expect(getGraphQLType(z.date().nullable())).toEqual(GraphQLString)

    expect(getGraphQLType(z.cuid().nullable())).toEqual(GraphQLID)
    expect(getGraphQLType(z.cuid2().nullable())).toEqual(GraphQLID)
    expect(getGraphQLType(z.ulid().nullable())).toEqual(GraphQLID)
    expect(getGraphQLType(z.uuid().nullable())).toEqual(GraphQLID)

    expect(getGraphQLType(z.email().nullable())).toEqual(GraphQLString)
    expect(getGraphQLType(z.literal("").nullable())).toEqual(GraphQLString)
    expect(getGraphQLType(z.literal(0).nullable())).toEqual(GraphQLFloat)
    expect(getGraphQLType(z.literal(false).nullable())).toEqual(GraphQLBoolean)
  })

  it("should handle custom type", () => {
    expect(
      getGraphQLType(
        z.date().optional().register(asField, { type: GraphQLDate })
      )
    ).toEqual(GraphQLDate)
  })

  it("should handle hidden field", () => {
    const Dog1 = z.object({
      __typename: z.literal("Dog").nullish(),
      name: z.string().optional(),
      birthday: z.date().optional().register(asField, { type: null }),
    })

    expect(printZodSilk(Dog1)).toMatchInlineSnapshot(`
      "type Dog {
        name: String
      }"
    `)

    const r1 = resolver.of(Dog1, {
      dog: query(Dog1, () => ({})),
      birthday: field.hidden,
    })

    expect(printResolver(r1)).toMatchInlineSnapshot(`
      "type Dog {
        name: String
      }

      type Query {
        dog: Dog!
      }"
    `)

    const Dog2 = z.object({
      __typename: z.literal("Dog").nullish(),
      name: z.string().optional(),
      birthday: z.date().optional().register(asField, { type: field.hidden }),
    })

    const r2 = resolver.of(Dog2, {
      dog: query(Dog2, () => ({})),
    })

    expect(printResolver(r2)).toMatchInlineSnapshot(`
      "type Dog {
        name: String
      }

      type Query {
        dog: Dog!
      }"
    `)
  })

  it("should handle preset GraphQLType", () => {
    const Dog = z.object({
      __typename: z.literal("Dog").nullish(),
      name: z.string().optional(),
      birthday: z.date().optional(),
    })

    const config = ZodWeaver.config({
      presetGraphQLType: (schema) => {
        if (schema instanceof z.ZodDate) return GraphQLDate
      },
    })

    const r1 = resolver({ dog: query(Dog, () => ({})) })
    const schema1 = ZodWeaver.weave(r1, config)

    const zSilk = ZodWeaver.useConfig(config)
    const zDog = zSilk(Dog)
    const r2 = resolver({ dog: query(zDog).resolve(() => ({})) })
    const schema2 = ZodWeaver.weave(r2)

    expect(printSchema(schema2)).toEqual(printSchema(schema1))

    expect(printSchema(schema1)).toMatchInlineSnapshot(`
      "type Query {
        dog: Dog!
      }

      type Dog {
        name: String
        birthday: Date
      }

      scalar Date"
    `)
  })

  it("should handle non null", () => {
    expect(getGraphQLType(z.string())).toEqual(
      new GraphQLNonNull(GraphQLString)
    )
    expect(getGraphQLType(z.string().nullable())).toEqual(GraphQLString)
    expect(getGraphQLType(z.string().optional())).toEqual(GraphQLString)
    expect(getGraphQLType(z.string().nullish())).toEqual(GraphQLString)
  })
  it("should handle array", () => {
    expect(getGraphQLType(z.array(z.string()))).toEqual(
      new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString)))
    )
    expect(getGraphQLType(z.string().array())).toEqual(
      new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString)))
    )

    expect(getGraphQLType(z.array(z.string()).optional())).toEqual(
      new GraphQLList(new GraphQLNonNull(GraphQLString))
    )

    expect(getGraphQLType(z.array(z.string().nullable()))).toEqual(
      new GraphQLNonNull(new GraphQLList(GraphQLString))
    )

    expect(getGraphQLType(z.array(z.string().nullable()).nullable())).toEqual(
      new GraphQLList(GraphQLString)
    )
  })
  it("should handle object", () => {
    const Cat2 = z
      .object({
        name: z.string(),
        age: z.number(),
        loveFish: z.boolean().optional(),
      })
      .register(asObjectType, { name: "Cat" })

    const Cat3 = z
      .object({
        name: z.string(),
        age: z.number(),
        loveFish: z.boolean().optional(),
      })
      .register(asObjectType, { name: "Cat" })

    const Cat = z.object({
      __typename: z.literal("Cat").nullish(),
      name: z.string(),
      age: z.number(),
      loveFish: z.boolean().optional(),
    })

    expect(printZodSilk(Cat)).toEqual(printZodSilk(Cat2))

    expect(printZodSilk(Cat)).toEqual(printZodSilk(Cat3))

    expect((getGraphQLType(Cat) as GraphQLNonNull<any>).ofType).toBeInstanceOf(
      GraphQLObjectType
    )

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
      .describe("Some fruits you might like")
      .register(asEnumType, {
        name: "Fruit",
        valuesConfig: {
          apple: { description: "red" },
          banana: { description: "yellow" },
          orange: { description: "orange" },
        },
      })

    expect(printZodSilk(fruitZ)).toMatchInlineSnapshot(`
      """"Some fruits you might like"""
      enum Fruit {
        """red"""
        apple

        """yellow"""
        banana

        """orange"""
        orange
      }"
    `)
  })

  it("should handle interfere", () => {
    const Fruit = z
      .object({
        __typename: z.literal("Fruit").nullish(),
        name: z.string(),
        color: z.string(),
        prize: z.number(),
      })
      .describe("Some fruits you might like")

    const Orange = z
      .object({
        __typename: z.literal("Orange"),
        name: z.string(),
        color: z.string(),
        prize: z.number(),
      })
      .register(asObjectType, { interfaces: [Fruit] })

    const r = resolver({
      orange: query(Orange, () => 0 as any),
    })

    expect(printResolver(r)).toMatchInlineSnapshot(`
      "type Query {
        orange: Orange!
      }

      type Orange implements Fruit {
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
    const Cat = z.object({
      name: z.string(),
      age: z.number(),
      loveFish: z.boolean().optional(),
    })

    const Dog = z.object({
      name: z.string(),
      age: z.number(),
      loveBone: z.boolean().optional(),
    })

    const Animal = z.union([Cat, Dog])

    collectNames({ Cat, Dog, Animal })
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
    const Cat = z.object({
      __typename: z.literal("Cat"),
      name: z.string(),
      age: z.number(),
      loveFish: z.boolean().optional(),
    })

    const Dog = z.object({
      __typename: z.literal("Dog"),
      name: z.string(),
      age: z.number(),
      loveBone: z.boolean().optional(),
    })

    const Animal = z
      .discriminatedUnion("__typename", [Cat, Dog])
      .register(asUnionType, { name: "Animal" })

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

    const resolveTypeBase = resolveTypeByDiscriminatedUnion(Animal)
    const resolveType = (data: z.infer<typeof Animal>) =>
      resolveTypeBase(data, {} as any, {} as any, {} as any)
    expect(resolveType({ __typename: "Cat", name: "", age: 6 })).toEqual("Cat")
    expect(resolveType({ __typename: "Dog", name: "", age: 6 })).toEqual("Dog")
  })

  it("should handle v3", () => {
    const z3Dog = z3.object({
      __typename: z3.literal("Dog"),
      name: z3.string(),
      birthday: z3.string(),
    })

    expect(printZodSilk(z3Dog)).toMatchInlineSnapshot(`
      "type Dog {
        name: String!
        birthday: String!
      }"
    `)
  })

  describe("should avoid duplicate", () => {
    it("should merge field from multiple resolver", () => {
      const Dog = z.object({
        __typename: z.literal("Dog").nullish(),
        name: z.string(),
        birthday: z.string(),
      })

      const r1 = resolver.of(Dog, {
        dog: query(Dog, () => ({ name: "", birthday: "2012-12-12" })),
        age: field(z.number(), (dog) => {
          return new Date().getFullYear() - new Date(dog.birthday).getFullYear()
        }),
      })

      const r2 = resolver.of(Dog, {
        greeting: field(z.string(), (dog) => {
          return `Hello ${dog.name}`
        }),
      })
      expect(printResolver(r1, r2)).toMatchInlineSnapshot(`
        "type Dog {
          name: String!
          birthday: String!
          age: Float!
          greeting: String!
        }

        type Query {
          dog: Dog!
        }"
      `)
    })
    it("should avoid duplicate object", () => {
      const Dog = z.object({
        __typename: z.literal("Dog").nullish(),
        name: z.string(),
        birthday: z.string(),
      })
      const r1 = resolver.of(Dog, {
        dog: query(Dog.optional(), () => ({
          name: "",
          birthday: "2012-12-12",
        })),
        dogs: query(z.array(Dog.nullable()), {
          resolve: () => [
            { name: "Fido", birthday: "2012-12-12" },
            { name: "Rover", birthday: "2012-12-12" },
          ],
        }),
        mustDog: query(Dog, () => ({
          name: "",
          birthday: "2012-12-12",
        })),
        mustDogs: query(z.array(Dog), () => []),
        age: field(z.number(), (dog) => {
          return new Date().getFullYear() - new Date(dog.birthday).getFullYear()
        }),
      })

      expect(printResolver(r1)).toMatchInlineSnapshot(`
        "type Dog {
          name: String!
          birthday: String!
          age: Float!
        }

        type Query {
          dog: Dog
          dogs: [Dog]!
          mustDog: Dog!
          mustDogs: [Dog!]!
        }"
      `)
    })
    it("should avoid duplicate input", () => {
      const Dog = z
        .object({
          __typename: z.literal("Dog").nullish(),
          name: z.string(),
          birthday: z.string().optional(),
        })
        .describe("Does the dog love fish?")

      const DogInput = Dog.extend({
        __typename: z.literal("DogInput").nullish(),
      })

      const DataInput = z.object({
        __typename: z.literal("DataInput").nullish(),
        dog: DogInput,
      })

      const r1 = resolver.of(Dog, {
        unwrap: query(Dog, {
          input: DogInput,
          resolve: (data) => ({ ...data, __typename: null }),
        }),
        dog: query(Dog, {
          input: { data: DogInput },
          resolve: ({ data }) => ({ ...data, __typename: null }),
        }),
        dogs: query(z.array(Dog), {
          input: {
            data: z.array(DogInput),
            required: z.array(DogInput),
            names: z.array(z.string()),
          },
          resolve: ({ data }) => data.map((d) => ({ ...d, __typename: null })),
        }),
        mustDog: query(
          Dog.required().register(asObjectType, { name: "DogRequired" }),
          {
            input: { data: DataInput },
            resolve: ({ data }) => ({
              ...data.dog,
              __typename: null,
              birthday: new Date().toLocaleString(),
            }),
          }
        ),
        age: field(z.number(), (dog) => {
          return (
            new Date().getFullYear() -
            new Date(dog.birthday ?? Date.now()).getFullYear()
          )
        }),
      })

      expect(printResolver(r1)).toMatchInlineSnapshot(`
        """"Does the dog love fish?"""
        type Dog {
          name: String!
          birthday: String
          age: Float!
        }

        type Query {
          unwrap(name: String!, birthday: String): Dog!
          dog(data: DogInput!): Dog!
          dogs(data: [DogInput!]!, required: [DogInput!]!, names: [String!]!): [Dog!]!
          mustDog(data: DataInput!): DogRequired!
        }

        input DogInput {
          name: String!
          birthday: String
        }

        type DogRequired {
          name: String!
          birthday: String!
        }

        input DataInput {
          dog: DogInput!
        }"
      `)
    })

    it("should avoid duplicate enum", () => {
      const Fruit = z
        .enum(["apple", "banana", "orange"])
        .register(asEnumType, { name: "Fruit" })
      const r1 = resolver({
        fruit: query(Fruit.optional(), () => "apple" as const),
        fruits: query(z.array(Fruit.optional()), () => []),
        mustFruit: query(Fruit, () => "apple" as const),
        mustFruits: query(z.array(Fruit), () => []),
      })
      expect(printResolver(r1)).toMatchInlineSnapshot(`
        "type Query {
          fruit: Fruit
          fruits: [Fruit]!
          mustFruit: Fruit!
          mustFruits: [Fruit!]!
        }

        enum Fruit {
          apple
          banana
          orange
        }"
      `)
    })

    it("should avoid duplicate interface", () => {
      const Fruit = z.object({
        __typename: z.literal("Fruit").nullish(),
        color: z.string().optional(),
      })
      const Orange = z
        .object({
          __typename: z.literal("Orange").nullish(),
          color: z.string().optional(),
          flavor: z.string(),
        })
        .register(asObjectType, { interfaces: [Fruit] })

      const Apple = z
        .object({
          color: z.string().optional(),
          flavor: z.string().optional(),
        })
        .register(asObjectType, { name: "Apple", interfaces: [Fruit] })

      const r1 = resolver({
        apple: query(Apple.optional(), () => ({ flavor: "" })),
        apples: query(z.array(Apple.optional()).optional(), () => []),
        orange: query(Orange.optional(), () => ({ flavor: "" })),
        oranges: query(z.array(Orange.nullable()), () => []),
        mustOrange: query(Orange, () => ({ flavor: "" })),
        mustOranges: query(z.array(Orange), () => []),
      })
      expect(printResolver(r1)).toMatchInlineSnapshot(`
        "type Query {
          apple: Apple
          apples: [Apple]
          orange: Orange
          oranges: [Orange]!
          mustOrange: Orange!
          mustOranges: [Orange!]!
        }

        type Apple implements Fruit {
          color: String
          flavor: String
        }

        interface Fruit {
          color: String
        }

        type Orange implements Fruit {
          color: String
          flavor: String!
        }"
      `)
    })

    it("should avoid duplicate union", () => {
      const Apple = z.object({
        __typename: z.literal("Apple").nullish(),
        flavor: z.string(),
      })
      const Orange = z.object({
        __typename: z.literal("Orange").nullish(),
        color: z.string(),
      })
      const Fruit = z
        .union([Apple, Orange])
        .register(asUnionType, { name: "Fruit" })

      const r1 = resolver({
        fruit: query(Fruit.optional(), () => ({ flavor: "" })),
        fruits: query(z.array(Fruit.optional()), () => []),
        mustFruit: query(Fruit, () => ({ flavor: "" })),
        mustFruits: query(z.array(Fruit), () => []),
      })

      expect(printResolver(r1)).toMatchInlineSnapshot(`
        "type Query {
          fruit: Fruit
          fruits: [Fruit]!
          mustFruit: Fruit!
          mustFruits: [Fruit!]!
        }

        union Fruit = Apple | Orange

        type Apple {
          flavor: String!
        }

        type Orange {
          color: String!
        }"
      `)
    })
  })
})

function printZodSilk(schema: Parameters<typeof getGraphQLType>[0]): string {
  let gqlType = getGraphQLType(schema)
  while ("ofType" in gqlType) gqlType = gqlType.ofType
  return printType(gqlType as GraphQLNamedType)
}

function printResolver(...resolvers: Loom.Resolver[]): string {
  const weaver = new GraphQLSchemaLoom()
  weaver.addVendor(ZodWeaver)
  for (const r of resolvers) weaver.add(r)
  const schema = weaver.weaveGraphQLSchema()
  return printSchema(schema)
}
