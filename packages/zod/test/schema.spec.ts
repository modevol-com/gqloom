import { describe, expect, it } from "vitest"
import { field, fieldType, objectType, query, resolver, zodSilk } from "../src"
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
  GraphQLScalarType,
} from "graphql"
import {
  type GQLoomExtensions,
  SchemaWeaver,
  type SilkResolver,
  getGraphQLType,
  collectNames,
} from "@gqloom/core"
import { resolveTypeByDiscriminatedUnion } from "../src/utils"

declare module "graphql" {
  export interface GraphQLObjectTypeExtensions extends GQLoomExtensions {}

  export interface GraphQLFieldExtensions<_TSource, _TContext, _TArgs = any>
    extends GQLoomExtensions {}
}

const GraphQLDate = new GraphQLScalarType<Date, string>({
  name: "Date",
})

describe("ZodSilk", () => {
  it("should handle scalar", () => {
    expect(getGraphQLType(zodSilk(z.string().nullable()))).toEqual(
      GraphQLString
    )
    expect(getGraphQLType(zodSilk(z.number().nullable()))).toEqual(GraphQLFloat)
    expect(getGraphQLType(zodSilk(z.number().int().nullable()))).toEqual(
      GraphQLInt
    )
    expect(
      getGraphQLType(zodSilk(z.boolean().default(false).nullable()))
    ).toEqual(GraphQLBoolean)
    expect(getGraphQLType(zodSilk(z.date().nullable()))).toEqual(GraphQLString)

    expect(
      getGraphQLType(
        zodSilk(
          z
            .string()
            .cuid()
            .nullable()
            .superRefine(() => {})
        )
      )
    ).toEqual(GraphQLID)
    expect(getGraphQLType(zodSilk(z.string().cuid2().nullable()))).toEqual(
      GraphQLID
    )
    expect(getGraphQLType(zodSilk(z.string().ulid().nullable()))).toEqual(
      GraphQLID
    )
    expect(getGraphQLType(zodSilk(z.string().uuid().nullable()))).toEqual(
      GraphQLID
    )

    expect(getGraphQLType(zodSilk(z.string().email().nullable()))).toEqual(
      GraphQLString
    )
  })

  it("should keep default value in extensions", () => {
    const objectType = z
      .object({
        foo: z.string().default("foo"),
      })
      .describe("ObjectType")
      .optional()

    const objectGqlType = getGraphQLType(
      zodSilk(objectType)
    ) as GraphQLObjectType

    const extensions = objectGqlType.getFields().foo.extensions

    expect(extensions.defaultValue).toEqual(expect.any(Function))
    expect(extensions.defaultValue?.()).toEqual("foo")
  })

  it("should handle custom type", () => {
    expect(
      getGraphQLType(
        zodSilk(
          z
            .date()
            .optional()
            .superRefine(fieldType({ type: GraphQLDate }))
        )
      )
    ).toEqual(GraphQLDate)
  })

  it("should handle non null", () => {
    expect(getGraphQLType(zodSilk(z.string()))).toEqual(
      new GraphQLNonNull(GraphQLString)
    )
    expect(getGraphQLType(zodSilk(z.string().nullable()))).toEqual(
      GraphQLString
    )
    expect(getGraphQLType(zodSilk(z.string().optional()))).toEqual(
      GraphQLString
    )
    expect(getGraphQLType(zodSilk(z.string().nullish()))).toEqual(GraphQLString)
  })
  it("should handle array", () => {
    expect(getGraphQLType(zodSilk(z.array(z.string())))).toEqual(
      new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString)))
    )
    expect(getGraphQLType(zodSilk(z.string().array()))).toEqual(
      new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString)))
    )

    expect(getGraphQLType(zodSilk(z.array(z.string()).optional()))).toEqual(
      new GraphQLList(new GraphQLNonNull(GraphQLString))
    )

    expect(getGraphQLType(zodSilk(z.array(z.string().nullable())))).toEqual(
      new GraphQLNonNull(new GraphQLList(GraphQLString))
    )

    expect(
      getGraphQLType(zodSilk(z.array(z.string().nullable()).nullable()))
    ).toEqual(new GraphQLList(GraphQLString))
  })
  it("should handle object", () => {
    const Cat1 = z
      .object({
        name: z.string(),
        age: z.number(),
        loveFish: z.boolean().optional(),
      })
      .describe("Cat")

    const Cat2 = z
      .object({
        name: z.string(),
        age: z.number(),
        loveFish: z.boolean().optional(),
      })
      .superRefine(objectType({ name: "Cat" }))

    const Cat = z.object({
      name: z.string(),
      age: z.number(),
      loveFish: z.boolean().optional(),
    })

    void collectNames({ Cat })

    expect(printZodSilk(Cat1)).toEqual(printZodSilk(Cat2))
    expect(printZodSilk(Cat)).toEqual(printZodSilk(Cat2))

    expect(
      (getGraphQLType(zodSilk(Cat)) as GraphQLNonNull<any>).ofType
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

    const Orange = z
      .object({
        name: z.string(),
        color: z.string(),
        prize: z.number(),
      })
      .superRefine(objectType({ name: "Orange", interfaces: [Fruit] }))

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

  describe("should avoid duplicate", () => {
    it("should merge field from multiple resolver", () => {
      const Dog = z
        .object({
          name: z.string(),
          birthday: z.string(),
        })
        .describe("Dog")

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
        "type Query {
          dog: Dog!
        }

        type Dog {
          name: String!
          birthday: String!
          age: Float!
          greeting: String!
        }"
      `)
    })
    it("should avoid duplicate object", () => {
      const Dog = z
        .object({
          name: z.string(),
          birthday: z.string(),
        })
        .describe("Dog")
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
        "type Query {
          dog: Dog
          dogs: [Dog]!
          mustDog: Dog!
          mustDogs: [Dog!]!
        }

        type Dog {
          name: String!
          birthday: String!
          age: Float!
        }"
      `)
    })
    it("should avoid duplicate input", () => {
      const Dog = z
        .object({
          name: z.string(),
          birthday: z.string(),
        })
        .describe("Dog: Does the dog love fish?")

      const DogInput = Dog.describe("DogInput")

      const DataInput = z
        .object({
          dog: DogInput,
        })
        .describe("DataInput")

      const r1 = resolver.of(Dog, {
        unwrap: query(Dog, {
          input: DogInput,
          resolve: (data) => data,
        }),
        dog: query(Dog, {
          input: { data: DogInput },
          resolve: ({ data }) => data,
        }),
        dogs: query(z.array(Dog), {
          input: {
            data: z.array(DogInput),
            required: z.array(DogInput),
            names: z.array(z.string()),
          },
          resolve: ({ data }) => data,
        }),
        mustDog: query(Dog.required(), {
          input: { data: DataInput },
          resolve: ({ data }) => data.dog,
        }),
        age: field(z.number(), (dog) => {
          return new Date().getFullYear() - new Date(dog.birthday).getFullYear()
        }),
      })

      expect(printResolver(r1)).toMatchInlineSnapshot(`
        "type Query {
          unwrap(name: String!, birthday: String!): Dog!
          dog(data: DogInput!): Dog!
          dogs(data: [DogInput!]!, required: [DogInput!]!, names: [String!]!): [Dog!]!
          mustDog(data: DataInput!): Dog!
        }

        """Does the dog love fish?"""
        type Dog {
          name: String!
          birthday: String!
          age: Float!
        }

        input DogInput {
          name: String!
          birthday: String!
        }

        input DataInput {
          dog: DogInput!
        }"
      `)
    })

    it("should avoid duplicate enum", () => {
      const Fruit = z.enum(["apple", "banana", "orange"]).describe("Fruit")
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
      const Fruit = z.object({ color: z.string().optional() }).describe("Fruit")
      const Orange = z
        .object({
          color: z.string().optional(),
          flavor: z.string(),
        })
        .superRefine(objectType({ name: "Orange", interfaces: [Fruit] }))

      const Apple = z
        .object({
          color: z.string().optional(),
          flavor: z.string().optional(),
        })
        .superRefine(objectType({ name: "Apple", interfaces: [Fruit] }))

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
      const Apple = z.object({ flavor: z.string() }).describe("Apple")
      const Orange = z.object({ color: z.string() }).describe("Orange")
      const Fruit = z.union([Apple, Orange]).describe("Fruit")

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

function printZodSilk(schema: Schema): string {
  let gqlType = getGraphQLType(zodSilk(schema))
  while ("ofType" in gqlType) gqlType = gqlType.ofType
  return printType(gqlType as GraphQLNamedType)
}

function printResolver(...resolvers: SilkResolver[]): string {
  const weaver = new SchemaWeaver()
  for (const r of resolvers) weaver.add(r)

  const schema = weaver.weaveGraphQLSchema()
  return printSchema(schema)
}
