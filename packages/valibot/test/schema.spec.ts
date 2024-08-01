import { describe, expect, it } from "vitest"
import { ValibotWeaver, field, query, resolver, valibotSilk } from "../src"
import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLString,
  GraphQLNonNull,
  type GraphQLNamedType,
  printType,
  GraphQLList,
  printSchema,
} from "graphql"
import {
  type GQLoomExtensions,
  getGraphQLType,
  collectNames,
  type SilkResolver,
  SchemaWeaver,
  weave,
} from "@gqloom/core"
import { asField, asObjectType } from "../src/metadata"
import {
  type BaseSchema,
  type BaseSchemaAsync,
  boolean,
  cuid2,
  date,
  email,
  integer,
  nonNullable,
  nonNullish,
  nonOptional,
  nullable,
  nullish,
  number,
  object,
  optional,
  pipe,
  string,
  ulid,
  uuid,
  array,
  picklist,
  enum_,
  union,
  variant,
  literal,
} from "valibot"
import { type PipedSchema } from "../src/types"

declare module "graphql" {
  export interface GraphQLObjectTypeExtensions extends GQLoomExtensions {}

  export interface GraphQLFieldExtensions<_TSource, _TContext, _TArgs = any>
    extends GQLoomExtensions {}
}

const GraphQLDate = new GraphQLScalarType<Date, string>({
  name: "Date",
})

describe("valibotSilk", () => {
  it("should handle scalar", () => {
    let schema: PipedSchema
    schema = nullable(string())
    expect(getGraphQLType(valibotSilk(schema))).toEqual(GraphQLString)

    schema = nullable(boolean())
    expect(getGraphQLType(valibotSilk(schema))).toEqual(GraphQLBoolean)
    schema = nullable(number())

    expect(getGraphQLType(valibotSilk(schema))).toEqual(GraphQLFloat)

    schema = pipe(nullable(number()), integer())
    expect(getGraphQLType(valibotSilk(schema))).toEqual(GraphQLInt)

    schema = pipe(optional(string()), ulid())
    expect(getGraphQLType(valibotSilk(schema))).toEqual(GraphQLID)

    schema = pipe(optional(string()), uuid())
    expect(getGraphQLType(valibotSilk(schema))).toEqual(GraphQLID)

    schema = pipe(optional(string()), cuid2())
    expect(getGraphQLType(valibotSilk(schema))).toEqual(GraphQLID)

    schema = pipe(optional(string()), email())
    expect(getGraphQLType(valibotSilk(schema))).toEqual(GraphQLString)
  })

  it("should keep default value in extensions", () => {
    const objectType = pipe(
      object({
        foo: optional(string(), () => "foo"),
      }),
      asObjectType({ name: "ObjectType" })
    )

    const objectGqlType = (
      getGraphQLType(
        valibotSilk(objectType)
      ) as GraphQLNonNull<GraphQLObjectType>
    ).ofType

    const extensions = objectGqlType.getFields().foo.extensions

    expect(extensions?.defaultValue).toEqual(expect.any(Function))
    expect(extensions?.defaultValue?.()).toEqual("foo")
  })

  it("should handle custom type", () => {
    expect(
      getGraphQLType(
        valibotSilk(pipe(nullable(date()), asField({ type: GraphQLDate })))
      )
    ).toEqual(GraphQLDate)
  })

  it("should handle hidden field", () => {
    const Dog = object({
      name: optional(string()),
      birthday: pipe(optional(date()), asField({ type: null })),
    })
    collectNames({ Dog })
    expect(printValibotSilk(Dog)).toMatchInlineSnapshot(`
      "type Dog {
        name: String
      }"
    `)
  })

  it("should handle preset GraphQLType", () => {
    const Dog = object({
      name: optional(string()),
      birthday: optional(date()),
    })
    collectNames({ Dog })

    const r1 = resolver({ dog: query(Dog, () => ({})) })
    const config = ValibotWeaver.config({
      presetGraphQLType: (schema) => {
        switch (schema.type) {
          case "date":
            return GraphQLDate
        }
      },
    })
    const schema1 = weave(r1, config)

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
    expect(getGraphQLType(valibotSilk(string()))).toEqual(
      new GraphQLNonNull(GraphQLString)
    )
    expect(getGraphQLType(valibotSilk(nonNullable(string())))).toEqual(
      new GraphQLNonNull(GraphQLString)
    )
    expect(getGraphQLType(valibotSilk(nonOptional(string())))).toEqual(
      new GraphQLNonNull(GraphQLString)
    )
    expect(getGraphQLType(valibotSilk(nonNullish(string())))).toEqual(
      new GraphQLNonNull(GraphQLString)
    )

    expect(getGraphQLType(valibotSilk(nullable(string())))).toEqual(
      GraphQLString
    )
    expect(getGraphQLType(valibotSilk(optional(string())))).toEqual(
      GraphQLString
    )
    expect(getGraphQLType(valibotSilk(nullish(string())))).toEqual(
      GraphQLString
    )
  })
  it("should handle array", () => {
    expect(getGraphQLType(valibotSilk(array(string())))).toEqual(
      new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString)))
    )

    expect(getGraphQLType(valibotSilk(optional(array(string()))))).toEqual(
      new GraphQLList(new GraphQLNonNull(GraphQLString))
    )

    expect(getGraphQLType(valibotSilk(array(nullable(string()))))).toEqual(
      new GraphQLNonNull(new GraphQLList(GraphQLString))
    )

    expect(
      getGraphQLType(valibotSilk(nullable(array(nullable(string())))))
    ).toEqual(new GraphQLList(GraphQLString))
  })

  it("should handle object", () => {
    const Cat1 = pipe(
      object({
        name: string(),
        age: pipe(number(), integer()),
        loveFish: optional(boolean()),
      }),
      asObjectType({ name: "Cat" })
    )

    const Cat = object({
      name: string(),
      age: pipe(number(), integer()),
      loveFish: optional(boolean()),
    })

    collectNames({ Cat })

    expect(printValibotSilk(Cat)).toEqual(printValibotSilk(Cat1))
    expect(
      (getGraphQLType(valibotSilk(Cat)) as GraphQLNonNull<any>).ofType
    ).toBeInstanceOf(GraphQLObjectType)

    expect(printValibotSilk(Cat)).toMatchInlineSnapshot(`
      "type Cat {
        name: String!
        age: Int!
        loveFish: Boolean
      }"
    `)
  })

  it("should handle enum", () => {
    const FruitPL = picklist(["apple", "banana", "orange"])
    enum Fruit {
      apple,
      banana,
      orange,
    }
    const FruitE = enum_(Fruit)

    collectNames({ Fruit: FruitPL }, { Fruit: FruitE })
    expect(printValibotSilk(FruitPL)).toEqual(printValibotSilk(FruitE))
    expect(printValibotSilk(FruitPL)).toMatchInlineSnapshot(`
      "enum Fruit {
        apple
        banana
        orange
      }"
    `)
  })

  it("should handle interfere", () => {
    const Fruit = object({
      _Fruit: boolean(),
      name: string(),
      color: string(),
      prize: number(),
    })

    const Orange = pipe(
      object({
        _Orange: boolean(),
        name: string(),
        color: string(),
        prize: number(),
      }),
      asObjectType({ interfaces: [Fruit] })
    )

    collectNames({ Fruit, Orange })

    const r = resolver.of(Orange, {
      orange: query(Orange, () => 0 as any),
    })

    expect(printResolver(r)).toMatchInlineSnapshot(`
      "type Query {
        orange: Orange!
      }

      type Orange implements Fruit {
        _Orange: Boolean!
        name: String!
        color: String!
        prize: Float!
      }

      interface Fruit {
        _Fruit: Boolean!
        name: String!
        color: String!
        prize: Float!
      }"
    `)
  })

  it("should handle union", () => {
    const Cat = object({
      name: string(),
      age: pipe(number(), integer()),
      loveFish: optional(boolean()),
    })

    const Dog = object({
      name: string(),
      age: pipe(number(), integer()),
      loveBone: optional(boolean()),
    })

    const Animal = union([Cat, Dog])

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
    const Cat = object({
      __typename: literal("Cat"),
      name: string(),
      age: pipe(number(), integer()),
      loveFish: optional(boolean()),
    })

    const Dog = object({
      __typename: literal("Dog"),
      name: string(),
      age: pipe(number(), integer()),
      loveBone: optional(boolean()),
    })

    const Animal = variant("__typename", [Cat, Dog])

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
      const Dog = object({
        name: string(),
        birthday: string(),
      })

      collectNames({ Dog })
      const r1 = resolver.of(Dog, {
        dog: query(Dog, () => ({ name: "", birthday: "2012-12-12" })),
        age: field(number(), (dog) => {
          return new Date().getFullYear() - new Date(dog.birthday).getFullYear()
        }),
      })

      const r2 = resolver.of(Dog, {
        greeting: field(string(), (dog) => {
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
      const Dog = object({
        name: string(),
        birthday: string(),
      })

      const Cat = object({
        name: string(),
        birthday: string(),
        friend: nullish(Dog),
      })

      collectNames({ Dog, Cat })
      const r1 = resolver.of(Dog, {
        dog: query(optional(Dog), () => ({
          name: "",
          birthday: "2012-12-12",
        })),
        cat: query(Cat, () => ({
          name: "",
          birthday: "2012-12-12",
        })),
        dogs: query(array(nullable(Dog)), () => [
          { name: "Fido", birthday: "2012-12-12" },
          { name: "Rover", birthday: "2012-12-12" },
        ]),
        mustDog: query(Dog, () => ({
          name: "",
          birthday: "2012-12-12",
        })),
        mustDogs: query(array(Dog), () => []),
        age: field(number(), (dog) => {
          return new Date().getFullYear() - new Date(dog.birthday).getFullYear()
        }),
      })

      expect(printResolver(r1)).toMatchInlineSnapshot(`
        "type Query {
          dog: Dog
          cat: Cat!
          dogs: [Dog]!
          mustDog: Dog!
          mustDogs: [Dog!]!
        }

        type Dog {
          name: String!
          birthday: String!
          age: Float!
        }

        type Cat {
          name: String!
          birthday: String!
          friend: Dog
        }"
      `)
    })

    it("should avoid duplicate input", () => {
      const Dog = object({
        name: string(),
        birthday: string(),
      })

      const DogInput = object(Dog.entries)

      const DataInput = object({
        dog: DogInput,
      })

      collectNames({ Dog, DogInput, DataInput })

      const r1 = resolver.of(Dog, {
        unwrap: query(Dog, {
          input: DogInput,
          resolve: (data) => data,
        }),
        dog: query(Dog, {
          input: { data: DogInput },
          resolve: ({ data }) => data,
        }),
        dogs: query(array(Dog), {
          input: {
            data: array(DogInput),
            required: array(DogInput),
            names: array(string()),
          },
          resolve: ({ data }) => data,
        }),
        mustDog: query(nonNullable(Dog), {
          input: { data: DataInput },
          resolve: ({ data }) => data.dog,
        }),
        age: field(number(), (dog) => {
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
      const Fruit = picklist(["apple", "banana", "orange"])

      collectNames({ Fruit })

      const r1 = resolver({
        fruit: query(optional(Fruit), () => "apple" as const),
        fruits: query(array(optional(Fruit)), () => []),
        mustFruit: query(Fruit, () => "apple" as const),
        mustFruits: query(array(Fruit), () => []),
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
      const Fruit = object({ color: optional(string()) })
      const Orange = pipe(
        object({
          color: optional(string()),
          flavor: string(),
        }),
        asObjectType({ interfaces: [Fruit] })
      )

      const Apple = pipe(
        object({
          color: optional(string()),
          flavor: optional(string()),
        }),
        asObjectType({ interfaces: [Fruit] })
      )

      collectNames({ Fruit, Orange, Apple })

      const r1 = resolver({
        apple: query(optional(Apple), () => ({ flavor: "" })),
        apples: query(optional(array(optional(Apple))), () => []),
        orange: query(optional(Orange), () => ({ flavor: "" })),
        oranges: query(array(nullable(Orange)), () => []),
        mustOrange: query(Orange, () => ({ flavor: "" })),
        mustOranges: query(array(Orange), () => []),
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
      const Apple = object({ flavor: string() })
      const Orange = object({ color: string() })
      const Fruit = union([Apple, Orange])
      collectNames({ Apple, Orange, Fruit })

      const r1 = resolver({
        fruit: query(optional(Fruit), () => ({ flavor: "" })),
        fruits: query(array(optional(Fruit)), () => []),
        mustFruit: query(Fruit, () => ({ flavor: "" })),
        mustFruits: query(array(Fruit), () => []),
        apple: query(optional(Apple), () => ({ flavor: "" })),
        apples: query(array(optional(Apple)), () => []),
        mustApple: query(Apple, () => ({ flavor: "" })),
        mustApples: query(array(Apple), () => []),
        orange: query(optional(Orange), () => ({ color: "" })),
        oranges: query(array(optional(Orange)), () => []),
        mustOrange: query(Orange, () => ({ color: "" })),
        mustOranges: query(array(Orange), () => []),
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

function printValibotSilk(
  schema: BaseSchema<any, any, any> | BaseSchemaAsync<any, any, any>
): string {
  let gqlType = getGraphQLType(valibotSilk(schema))
  while ("ofType" in gqlType) gqlType = gqlType.ofType
  return printType(gqlType as GraphQLNamedType)
}

function printResolver(...resolvers: SilkResolver[]): string {
  const weaver = new SchemaWeaver()
  for (const r of resolvers) weaver.add(r)

  const schema = weaver.weaveGraphQLSchema()
  return printSchema(schema)
}
