import {
  type GQLoomExtensions,
  GraphQLSchemaLoom,
  type SilkResolver,
  field,
  query,
  resolver,
  weave,
} from "@gqloom/core"
import type { SchemaWeaver } from "@gqloom/core"
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
import * as v from "valibot"
import { describe, expect, expectTypeOf, it } from "vitest"
import {
  ValibotWeaver,
  asEnumType,
  asField,
  asObjectType,
  asUnionType,
} from "../src"
import type { PipedSchema } from "../src/types"

declare module "graphql" {
  export interface GraphQLObjectTypeExtensions extends GQLoomExtensions {}

  export interface GraphQLFieldExtensions<_TSource, _TContext, _TArgs = any>
    extends GQLoomExtensions {}
}

const GraphQLDate = new GraphQLScalarType<Date, string>({
  name: "Date",
})

const getGraphQLType = ValibotWeaver.getGraphQLType

describe("ValibotWeaver", () => {
  it("should satisfy SchemaVendorWeaver", () => {
    expectTypeOf(ValibotWeaver).toMatchTypeOf<SchemaWeaver>()
  })
  it("should handle scalar", () => {
    let schema: PipedSchema
    schema = v.nullable(v.string())
    expect(getGraphQLType(schema)).toEqual(GraphQLString)

    schema = v.nullable(v.boolean())
    expect(getGraphQLType(schema)).toEqual(GraphQLBoolean)
    schema = v.nullable(v.number())

    expect(getGraphQLType(schema)).toEqual(GraphQLFloat)

    schema = v.nullable(v.pipe(v.number(), v.integer()))
    expect(getGraphQLType(schema)).toEqual(GraphQLInt)

    schema = v.optional(v.pipe(v.string(), v.ulid()))
    expect(getGraphQLType(schema)).toEqual(GraphQLID)

    schema = v.optional(v.pipe(v.string(), v.uuid()))
    expect(getGraphQLType(schema)).toEqual(GraphQLID)

    schema = v.optional(v.pipe(v.string(), v.cuid2()))
    expect(getGraphQLType(schema)).toEqual(GraphQLID)

    schema = v.optional(v.pipe(v.string(), v.email()))
    expect(getGraphQLType(schema)).toEqual(GraphQLString)
  })

  it("should keep default value in extensions", () => {
    const objectType = v.pipe(
      v.object({
        foo: v.optional(v.string(), () => "foo"),
      }),
      asObjectType({ name: "ObjectType" })
    )

    const objectGqlType = (
      getGraphQLType(objectType) as GraphQLNonNull<GraphQLObjectType>
    ).ofType

    const extensions = objectGqlType.getFields().foo.extensions

    expect(extensions?.defaultValue).toEqual(expect.any(Function))
    expect(extensions?.defaultValue?.()).toEqual("foo")
  })

  it("should handle custom type", () => {
    expect(
      getGraphQLType(
        v.pipe(v.nullable(v.date()), asField({ type: GraphQLDate }))
      )
    ).toEqual(GraphQLDate)

    const Cat = v.pipe(
      v.object({
        name: v.string(),
        age: v.pipe(
          v.number(),
          asField({ type: GraphQLInt, description: "How old is the cat" })
        ),
        loveFish: v.nullish(v.boolean()),
      }),
      asObjectType({
        name: "Cat",
        description: "A cute cat",
      })
    )
    expect(
      printType(getGraphQLType(v.nullish(Cat)) as GraphQLNamedType)
    ).toMatchInlineSnapshot(`
      """"A cute cat"""
      type Cat {
        name: String!

        """How old is the cat"""
        age: Int
        loveFish: Boolean
      }"
    `)
  })

  it("should handle hidden field", () => {
    const Dog = v.object({
      __typename: v.nullish(v.literal("Dog")),
      name: v.optional(v.string()),
      birthday: v.pipe(v.optional(v.date()), asField({ type: null })),
    })

    expect(print(Dog)).toMatchInlineSnapshot(`
      "type Dog {
        name: String
      }"
    `)

    const r = resolver.of(Dog, {
      dog: query(Dog, () => ({})),
      birthday: field.hidden,
    })

    expect(printResolver(r)).toMatchInlineSnapshot(`
      "type Dog {
        name: String
      }

      type Query {
        dog: Dog!
      }"
    `)
  })

  it("should handle preset GraphQLType", () => {
    const Dog = v.object({
      __typename: v.nullish(v.literal("Dog")),
      name: v.optional(v.string()),
      birthday: v.optional(v.date()),
    })

    const r1 = resolver({ dog: query(Dog, () => ({})) })
    const config = ValibotWeaver.config({
      presetGraphQLType: (schema) => {
        switch (schema.type) {
          case "date":
            return GraphQLDate
        }
      },
    })
    const schema1 = ValibotWeaver.weave(r1, config)

    const vSilk = ValibotWeaver.useConfig(config)
    const r2 = resolver({ dog: query(vSilk(Dog), () => ({})) })
    const schema2 = weave(r2)

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
    expect(getGraphQLType(v.string())).toEqual(
      new GraphQLNonNull(GraphQLString)
    )
    expect(getGraphQLType(v.nonNullable(v.string()))).toEqual(
      new GraphQLNonNull(GraphQLString)
    )
    expect(getGraphQLType(v.nonOptional(v.string()))).toEqual(
      new GraphQLNonNull(GraphQLString)
    )
    expect(getGraphQLType(v.nonNullish(v.string()))).toEqual(
      new GraphQLNonNull(GraphQLString)
    )

    expect(getGraphQLType(v.nullable(v.string()))).toEqual(GraphQLString)
    expect(getGraphQLType(v.optional(v.string()))).toEqual(GraphQLString)
    expect(getGraphQLType(v.nullish(v.string()))).toEqual(GraphQLString)
  })
  it("should handle array", () => {
    expect(getGraphQLType(v.array(v.string()))).toEqual(
      new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString)))
    )

    expect(getGraphQLType(v.optional(v.array(v.string())))).toEqual(
      new GraphQLList(new GraphQLNonNull(GraphQLString))
    )

    expect(getGraphQLType(v.array(v.nullable(v.string())))).toEqual(
      new GraphQLNonNull(new GraphQLList(GraphQLString))
    )

    expect(getGraphQLType(v.nullable(v.array(v.nullable(v.string()))))).toEqual(
      new GraphQLList(GraphQLString)
    )
  })

  it("should handle object", () => {
    const Cat1 = v.pipe(
      v.object({
        name: v.string(),
        age: v.pipe(v.number(), v.integer()),
        loveFish: v.optional(v.boolean()),
      }),
      asObjectType({ name: "Cat" })
    )

    const Cat2 = v.object({
      __typename: v.literal("Cat"),
      name: v.string(),
      age: v.pipe(v.number(), v.integer()),
      loveFish: v.optional(v.boolean()),
    })

    const Cat = v.object({
      __typename: v.literal("Cat"),
      name: v.string(),
      age: v.pipe(v.number(), v.integer()),
      loveFish: v.optional(v.boolean()),
    })

    expect(print(Cat)).toEqual(print(Cat1))
    expect(print(Cat)).toEqual(print(Cat2))

    expect((getGraphQLType(Cat) as GraphQLNonNull<any>).ofType).toBeInstanceOf(
      GraphQLObjectType
    )

    expect(print(Cat)).toMatchInlineSnapshot(`
      "type Cat {
        name: String!
        age: Int!
        loveFish: Boolean
      }"
    `)
  })

  it("should handle enum", () => {
    const FruitPL = v.pipe(
      v.picklist(["apple", "banana", "orange"]),
      asEnumType({
        name: "Fruit",
        valuesConfig: {
          apple: { description: "red" },
          banana: { description: "yellow" },
          orange: { description: "orange" },
        },
      })
    )
    enum Fruit {
      apple = "apple",
      banana = "banana",
      orange = "orange",
    }

    const FruitE = v.pipe(
      v.enum_(Fruit),
      asEnumType({
        name: "Fruit",
        valuesConfig: {
          apple: { description: "red" },
          [Fruit.banana]: { description: "yellow" },
          [Fruit.orange]: { description: "orange" },
        },
      })
    )

    expect(print(FruitE)).toMatchInlineSnapshot(`
      "enum Fruit {
        """red"""
        apple

        """yellow"""
        banana

        """orange"""
        orange
      }"
    `)
    expect(print(FruitPL)).toMatchInlineSnapshot(`
      "enum Fruit {
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
    const Fruit = v.object({
      __typename: v.nullish(v.literal("Fruit")),
      name: v.string(),
      color: v.string(),
      prize: v.number(),
    })

    const Orange = v.pipe(
      v.object({
        __typename: v.nullish(v.literal("Orange")),
        name: v.string(),
        color: v.string(),
        prize: v.number(),
      }),
      asObjectType({ interfaces: [Fruit] })
    )

    const r = resolver.of(Orange, {
      orange: query(Orange, () => 0 as any),
    })

    expect(printResolver(r)).toMatchInlineSnapshot(`
      "type Orange implements Fruit {
        name: String!
        color: String!
        prize: Float!
      }

      interface Fruit {
        name: String!
        color: String!
        prize: Float!
      }

      type Query {
        orange: Orange!
      }"
    `)
  })

  it("should handle union", () => {
    const Cat = v.object({
      __typename: v.nullish(v.literal("Cat")),
      name: v.string(),
      age: v.pipe(v.number(), v.integer()),
      loveFish: v.optional(v.boolean()),
    })

    const Dog = v.object({
      __typename: v.nullish(v.literal("Dog")),
      name: v.string(),
      age: v.pipe(v.number(), v.integer()),
      loveBone: v.optional(v.boolean()),
    })

    const Animal = v.pipe(
      v.union([Cat, Dog]),
      asUnionType({
        name: "Animal",
        resolveType: (it) => {
          if (it.loveFish) return "Cat"
          return "Dog"
        },
      })
    )

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
        age: Int!
        loveFish: Boolean
      }

      type Dog {
        name: String!
        age: Int!
        loveBone: Boolean
      }"
    `)
  })

  it("should handle variant", () => {
    const Cat = v.object({
      __typename: v.literal("Cat"),
      name: v.string(),
      age: v.pipe(v.number(), v.integer()),
      loveFish: v.optional(v.boolean()),
    })

    const Dog = v.object({
      __typename: v.literal("Dog"),
      name: v.string(),
      age: v.pipe(v.number(), v.integer()),
      loveBone: v.optional(v.boolean()),
    })

    const Animal = v.pipe(
      v.variant("__typename", [Cat, Dog]),
      asUnionType({ name: "Animal" })
    )

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
        age: Int!
        loveFish: Boolean
      }

      type Dog {
        name: String!
        age: Int!
        loveBone: Boolean
      }"
    `)
  })

  describe("should avoid duplicate", () => {
    it("should merge field from multiple resolver", () => {
      const Dog = v.object({
        __typename: v.nullish(v.literal("Dog")),
        name: v.string(),
        birthday: v.string(),
      })

      const r1 = resolver.of(Dog, {
        dog: query(Dog, () => ({ name: "", birthday: "2012-12-12" })),
        age: field(v.number(), (dog) => {
          return new Date().getFullYear() - new Date(dog.birthday).getFullYear()
        }),
      })

      const r2 = resolver.of(Dog, {
        greeting: field(v.string(), (dog) => {
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
      const Dog = v.object({
        __typename: v.nullish(v.literal("Dog")),
        name: v.string(),
        birthday: v.string(),
      })

      const Cat = v.object({
        __typename: v.nullish(v.literal("Cat")),
        name: v.string(),
        birthday: v.string(),
        friend: v.nullish(Dog),
      })

      const r1 = resolver.of(Dog, {
        dog: query(v.optional(Dog), () => ({
          name: "",
          birthday: "2012-12-12",
        })),
        cat: query(Cat, () => ({
          name: "",
          birthday: "2012-12-12",
        })),
        dogs: query(v.array(v.nullable(Dog)), () => [
          { name: "Fido", birthday: "2012-12-12" },
          { name: "Rover", birthday: "2012-12-12" },
        ]),
        mustDog: query(Dog, () => ({
          name: "",
          birthday: "2012-12-12",
        })),
        mustDogs: query(v.array(Dog), () => []),
        age: field(v.number(), (dog) => {
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
          cat: Cat!
          dogs: [Dog]!
          mustDog: Dog!
          mustDogs: [Dog!]!
        }

        type Cat {
          name: String!
          birthday: String!
          friend: Dog
        }"
      `)
    })

    it("should avoid duplicate object in pipe", () => {
      const Prize = v.object({
        __typename: v.nullish(v.literal("Prize")),
        name: v.string(),
        value: v.number(),
      })

      const Orange = v.object({
        __typename: v.literal("Orange"),
        name: v.string(),
        color: v.string(),
        prize: v.pipe(Prize, asField({})),
      })

      const Apple = v.object({
        __typename: v.literal("Apple"),
        name: v.string(),
        color: v.string(),
        prize: v.pipe(Prize, asField({})),
      })

      const r = resolver.of(Orange, {
        orange: query(Orange, () => 0 as any),
        apple: query(Apple, () => 0 as any),
      })

      expect(printResolver(r)).toMatchInlineSnapshot(`
        "type Orange {
          name: String!
          color: String!
          prize: Prize!
        }

        type Prize {
          name: String!
          value: Float!
        }

        type Query {
          orange: Orange!
          apple: Apple!
        }

        type Apple {
          name: String!
          color: String!
          prize: Prize!
        }"
      `)
    })

    it("should avoid duplicate object in interface", () => {
      const Prize = v.object({
        __typename: v.nullish(v.literal("Prize")),
        name: v.string(),
        value: v.number(),
      })

      const Fruit = v.object({
        __typename: v.literal("Fruit"),
        name: v.string(),
        color: v.string(),
        prize: Prize,
      })

      const Orange = v.pipe(
        v.object({
          ...Fruit.entries,
          __typename: v.literal("Orange"),
        }),
        asObjectType({ interfaces: [Fruit] })
      )

      const Apple = v.pipe(
        v.object({
          ...Fruit.entries,
          __typename: v.literal("Apple"),
        }),
        asObjectType({ interfaces: [Fruit] })
      )

      const r = resolver.of(Orange, {
        orange: query(Orange, () => 0 as any),
        apple: query(Apple, () => 0 as any),
      })

      expect(printResolver(r)).toMatchInlineSnapshot(`
        "type Orange implements Fruit {
          name: String!
          color: String!
          prize: Prize!
        }

        interface Fruit {
          name: String!
          color: String!
          prize: Prize!
        }

        type Prize {
          name: String!
          value: Float!
        }

        type Query {
          orange: Orange!
          apple: Apple!
        }

        type Apple implements Fruit {
          name: String!
          color: String!
          prize: Prize!
        }"
      `)
    })

    it("should avoid duplicate input", () => {
      const Dog = v.object({
        __typename: v.nullish(v.literal("Dog")),
        name: v.string(),
        birthday: v.string(),
      })

      const DogInput = v.object({
        ...Dog.entries,
        __typename: v.nullish(v.literal("DogInput")),
      })

      const DataInput = v.object({
        __typename: v.nullish(v.literal("DataInput")),
        dog: DogInput,
      })

      const r1 = resolver.of(Dog, {
        unwrap: query(Dog, {
          input: DogInput,
          resolve: (data) => ({ ...data, __typename: undefined }),
        }),
        dog: query(Dog, {
          input: { data: DogInput },
          resolve: ({ data }) => ({ ...data, __typename: undefined }),
        }),
        dogs: query(v.array(Dog), {
          input: {
            data: v.array(DogInput),
            required: v.array(DogInput),
            names: v.array(v.string()),
          },
          resolve: ({ data }) =>
            data.map((d) => ({ ...d, __typename: undefined })),
        }),
        mustDog: query(v.nonNullable(Dog), {
          input: { data: DataInput },
          resolve: ({ data }) => ({ ...data.dog, __typename: undefined }),
        }),
        age: field(v.number(), (dog) => {
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
          unwrap(name: String!, birthday: String!): Dog!
          dog(data: DogInput!): Dog!
          dogs(data: [DogInput!]!, required: [DogInput!]!, names: [String!]!): [Dog!]!
          mustDog(data: DataInput!): Dog!
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
      const Fruit = v.pipe(
        v.picklist(["apple", "banana", "orange"]),
        asEnumType("Fruit")
      )

      const r1 = resolver({
        fruit: query(v.optional(Fruit), () => "apple" as const),
        fruits: query(v.array(v.optional(Fruit)), () => []),
        mustFruit: query(Fruit, () => "apple" as const),
        mustFruits: query(v.array(Fruit), () => []),
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
      const Fruit = v.object({
        __typename: v.nullish(v.literal("Fruit")),
        color: v.optional(v.string()),
      })
      const Orange = v.pipe(
        v.object({
          __typename: v.nullish(v.literal("Orange")),
          color: v.optional(v.string()),
          flavor: v.string(),
        }),
        asObjectType({ interfaces: [Fruit] })
      )

      const Apple = v.pipe(
        v.object({
          __typename: v.nullish(v.literal("Apple")),
          color: v.optional(v.string()),
          flavor: v.optional(v.string()),
        }),
        asObjectType({ interfaces: [Fruit] })
      )

      const r1 = resolver({
        apple: query(v.optional(Apple), () => ({ flavor: "" })),
        apples: query(v.optional(v.array(v.optional(Apple))), () => []),
        orange: query(v.optional(Orange), () => ({ flavor: "" })),
        oranges: query(v.array(v.nullable(Orange)), () => []),
        mustOrange: query(Orange, () => ({ flavor: "" })),
        mustOranges: query(v.array(Orange), () => []),
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
      const Apple = v.object({
        __typename: v.nullish(v.literal("Apple")),
        flavor: v.string(),
      })
      const Orange = v.object({
        __typename: v.nullish(v.literal("Orange")),
        color: v.string(),
      })
      const Fruit = v.pipe(
        v.union([Apple, Orange]),
        asUnionType({ name: "Fruit" })
      )

      const r1 = resolver({
        fruit: query(v.optional(Fruit), () => ({ flavor: "" })),
        fruits: query(v.array(v.optional(Fruit)), () => []),
        mustFruit: query(Fruit, () => ({ flavor: "" })),
        mustFruits: query(v.array(Fruit), () => []),
        apple: query(v.optional(Apple), () => ({ flavor: "" })),
        apples: query(v.array(v.optional(Apple)), () => []),
        mustApple: query(Apple, () => ({ flavor: "" })),
        mustApples: query(v.array(Apple), () => []),
        orange: query(v.optional(Orange), () => ({ color: "" })),
        oranges: query(v.array(v.optional(Orange)), () => []),
        mustOrange: query(Orange, () => ({ color: "" })),
        mustOranges: query(v.array(Orange), () => []),
      })

      expect(printResolver(r1)).toMatchInlineSnapshot(`
        "type Query {
          fruit: Fruit
          fruits: [Fruit]!
          mustFruit: Fruit!
          mustFruits: [Fruit!]!
          apple: Apple
          apples: [Apple]!
          mustApple: Apple!
          mustApples: [Apple!]!
          orange: Orange
          oranges: [Orange]!
          mustOrange: Orange!
          mustOranges: [Orange!]!
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

function print(
  schema: v.BaseSchema<any, any, any> | v.BaseSchemaAsync<any, any, any>
): string {
  let gqlType = getGraphQLType(schema)
  while ("ofType" in gqlType) gqlType = gqlType.ofType
  return printType(gqlType as GraphQLNamedType)
}

function printResolver(...resolvers: SilkResolver[]): string {
  const weaver = new GraphQLSchemaLoom()
  weaver.addVendor(ValibotWeaver)
  for (const r of resolvers) weaver.add(r)

  const schema = weaver.weaveGraphQLSchema()
  return printSchema(schema)
}
