import { describe, expect, expectTypeOf, it } from "vitest"
import {
  date,
  number,
  object,
  string,
  boolean,
  array,
  mixed,
  type Schema,
  type InferType,
} from "yup"
import {
  type GQLoomMetadata,
  field,
  query,
  resolver,
  yupSilk,
  union,
} from "../src/index"
import {
  GraphQLString,
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInt,
  GraphQLNonNull,
  printType,
  GraphQLList,
  type GraphQLNamedType,
  printSchema,
  GraphQLScalarType,
  type GraphQLObjectType,
} from "graphql"
import {
  type GQLoomExtensions,
  SchemaWeaver,
  type SilkResolver,
} from "@gqloom/core"

declare module "yup" {
  export interface CustomSchemaMetadata extends GQLoomMetadata {}
}

declare module "graphql" {
  export interface GraphQLObjectTypeExtensions extends GQLoomExtensions {}

  export interface GraphQLFieldExtensions<_TSource, _TContext, _TArgs = any>
    extends GQLoomExtensions {}
}

const GraphQLDate = new GraphQLScalarType({
  name: "Date",
})

describe("YupSilk", () => {
  it("should handle scalar", () => {
    expect(yupSilk(string()).getGraphQLType()).toEqual(GraphQLString)
    expect(yupSilk(boolean()).getGraphQLType()).toEqual(GraphQLBoolean)
    expect(yupSilk(number()).getGraphQLType()).toEqual(GraphQLFloat)
    expect(yupSilk(number().integer()).getGraphQLType()).toEqual(GraphQLInt)
  })

  it("should keep default value in extensions", () => {
    const objectType = object({
      foo: string().optional().default("foo"),
    }).label("ObjectType")

    const objectSilk = yupSilk(objectType)
    const objectGqlType = objectSilk.getGraphQLType() as GraphQLObjectType

    expect(objectGqlType.getFields().foo).toMatchObject({
      extensions: {
        gqloom: { defaultValue: "foo" },
      },
    })

    const fooGetter = () => "foo"

    const objectE1Type = object({
      foo: string()
        .optional()
        .default("foo")
        .meta({ extension: { gqloom: { defaultValue: fooGetter } } }),
    }).label("ObjectType")

    const objectE1Silk = yupSilk(objectE1Type)
    const objectE1GqlType = objectE1Silk.getGraphQLType() as GraphQLObjectType

    expect(objectE1GqlType.getFields().foo).toMatchObject({
      extensions: {
        gqloom: { defaultValue: fooGetter },
      },
    })
  })

  it("should handle custom type", () => {
    expect(
      yupSilk(date().meta({ type: () => GraphQLDate })).getGraphQLType()
    ).toEqual(GraphQLDate)
  })

  it("should handle non null", () => {
    const s = yupSilk(string().required()).getGraphQLType()
    expect(s).toBeInstanceOf(GraphQLNonNull)
    expect(s).toMatchObject({ ofType: GraphQLString })

    const b = yupSilk(boolean().required()).getGraphQLType()
    expect(b).toBeInstanceOf(GraphQLNonNull)
    expect(b).toMatchObject({ ofType: GraphQLBoolean })

    const f = yupSilk(number().required()).getGraphQLType()
    expect(f).toBeInstanceOf(GraphQLNonNull)
    expect(f).toMatchObject({ ofType: GraphQLFloat })

    const i = yupSilk(number().required().integer()).getGraphQLType()
    expect(i).toBeInstanceOf(GraphQLNonNull)
    expect(i).toMatchObject({ ofType: GraphQLInt })

    const d = yupSilk(
      date()
        .meta({ type: () => GraphQLDate })
        .required()
    ).getGraphQLType()
    expect(d).toBeInstanceOf(GraphQLNonNull)
    expect(d).toMatchObject({ ofType: GraphQLDate })
  })

  it("should handle array", () => {
    const s = yupSilk(array().of(string())).getGraphQLType()
    expect(s).toBeInstanceOf(GraphQLList)
    expect(s).toMatchObject({ ofType: GraphQLString })

    const b = yupSilk(array().of(boolean())).getGraphQLType()
    expect(b).toBeInstanceOf(GraphQLList)
    expect(b).toMatchObject({ ofType: GraphQLBoolean })

    const f = yupSilk(array(number())).getGraphQLType()
    expect(f).toBeInstanceOf(GraphQLList)
    expect(f).toMatchObject({ ofType: GraphQLFloat })

    const i = yupSilk(array(number().integer())).getGraphQLType()
    expect(i).toBeInstanceOf(GraphQLList)
    expect(i).toMatchObject({ ofType: GraphQLInt })

    const d = yupSilk(
      array(date().meta({ type: () => GraphQLDate }))
    ).getGraphQLType()
    expect(d).toBeInstanceOf(GraphQLList)
    expect(d).toMatchObject({ ofType: GraphQLDate })
  })

  it("should handle object", () => {
    const Giraffe = object({
      name: string().required(),
      birthday: date()
        .meta({ type: () => GraphQLDate })
        .required(),
      height: number().meta({
        description: "The giraffe's height in meters",
      }),
      hobbies: array(string().required()),
      friends: array(string()).required(),
    })
      .label("Giraffe")
      .meta({
        description: "A giraffe",
      })

    expect(printYupSilk(Giraffe)).toMatchInlineSnapshot(`
      """"A giraffe"""
      type Giraffe {
        name: String!
        birthday: Date!

        """The giraffe's height in meters"""
        height: Float
        hobbies: [String!]
        friends: [String]!
      }"
    `)
  })

  it("should handle enum", () => {
    const enumValueDescriptions = {
      apple: "Apple is red",
      banana: "Banana is yellow",
      orange: "Orange is orange",
    }
    const fruitS = string()
      .oneOf(["apple", "banana", "orange"])
      .label("Fruit")
      .meta({
        description: "Some fruits you might like",
        enumValues: enumValueDescriptions,
      })

    type Fruit1 = InferType<typeof fruitS>
    expectTypeOf<Fruit1>().toEqualTypeOf<
      "apple" | "banana" | "orange" | undefined
    >()

    const fruitM = mixed<"apple" | "banana" | "orange">()
      .oneOf(["apple", "banana", "orange"])
      .label("Fruit")
      .meta({
        description: "Some fruits you might like",
        enumValues: enumValueDescriptions,
      })

    expectTypeOf<InferType<typeof fruitM>>().toEqualTypeOf<
      "apple" | "banana" | "orange" | undefined
    >()

    enum Fruit {
      apple,
      banana,
      orange,
    }

    const fruitE = mixed<Fruit>()
      .oneOf(Object.values(Fruit) as Fruit[])
      .label("Fruit")
      .meta({
        enum: Fruit,
        description: "Some fruits you might like",
        enumValues: enumValueDescriptions,
      })

    expectTypeOf<InferType<typeof fruitE>>().toEqualTypeOf<Fruit | undefined>()

    expect(printYupSilk(fruitM)).toEqual(printYupSilk(fruitS))
    expect(printYupSilk(fruitE)).toEqual(printYupSilk(fruitM))
    expect(printYupSilk(fruitE)).toMatchInlineSnapshot(`
      """"Some fruits you might like"""
      enum Fruit {
        """Apple is red"""
        apple

        """Banana is yellow"""
        banana

        """Orange is orange"""
        orange
      }"
    `)
  })

  it("should handle interfere", () => {
    const Fruit = object({
      name: string().required(),
      color: string().required(),
      prize: number()
        .required()
        .meta({ description: "How much do you want to win?" }),
    })
      .meta({ description: "Fruit Interface" })
      .label("Fruit")

    const Orange = object({
      name: string().required(),
      color: string().required(),
      prize: number().required(),
    })
      .meta({ interfaces: [Fruit] })
      .label("Orange")

    const simpleResolver = resolver({
      orange: query(Orange, () => 0 as any),
    })

    expect(printYupSilk(Orange)).toMatchInlineSnapshot(`
      "type Orange implements Fruit {
        name: String!
        color: String!
        prize: Float!
      }"
    `)

    expect(printResolver(simpleResolver)).toMatchInlineSnapshot(`
      "type Query {
        orange: Orange
      }

      type Orange implements Fruit {
        name: String!
        color: String!
        prize: Float!
      }

      """Fruit Interface"""
      interface Fruit {
        name: String!
        color: String!

        """How much do you want to win?"""
        prize: Float!
      }"
    `)
  })

  it("should handle union", () => {
    const Cat = object({
      name: string().required(),
      color: string().required(),
    }).label("Cat")

    const Dog = object({
      name: string().required(),
      height: number().required(),
    }).label("Dog")

    const Animal = union([Cat, Dog])
      .label("Animal")
      .meta({ description: "Do you love animals ?" })

    const simpleResolver = resolver({
      animal: query(Animal, () => 0 as any),
    })
    expect(printResolver(simpleResolver)).toMatchInlineSnapshot(`
      "type Query {
        animal: Animal
      }

      """Do you love animals ?"""
      union Animal = Cat | Dog

      type Cat {
        name: String!
        color: String!
      }

      type Dog {
        name: String!
        height: Float!
      }"
    `)
  })

  describe("should avoid duplicate", () => {
    it("should merge field from multiple resolver", () => {
      const Dog = object({
        name: string().required(),
        birthday: string().required(),
      }).label("Dog")

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
          dog: Dog
        }

        type Dog {
          name: String!
          birthday: String!
          age: Float
          greeting: String
        }"
      `)
    })

    it("should avoid duplicate object", () => {
      const Dog = object({
        name: string().required(),
        birthday: string().required(),
      }).label("Dog")

      const r1 = resolver.of(Dog, {
        dog: query(Dog, () => ({ name: "", birthday: "2012-12-12" })),
        dogs: query(array(Dog), {
          resolve: () => [
            { name: "Fido", birthday: "2012-12-12" },
            { name: "Rover", birthday: "2012-12-12" },
          ],
        }),
        mustDog: query(Dog.required(), () => ({
          name: "",
          birthday: "2012-12-12",
        })),
        mustDogs: query(array(Dog.required()), () => []),
        age: field(number(), (dog) => {
          return new Date().getFullYear() - new Date(dog.birthday).getFullYear()
        }),
      })

      expect(printResolver(r1)).toMatchInlineSnapshot(`
        "type Query {
          dog: Dog
          dogs: [Dog]
          mustDog: Dog!
          mustDogs: [Dog!]
        }

        type Dog {
          name: String!
          birthday: String!
          age: Float
        }"
      `)
    })

    it("should avoid duplicate input", () => {
      const Dog = object({
        name: string().required(),
        birthday: string().required(),
      })
        .label("Dog")
        .meta({ description: "Dog Type" })

      const DogInput = Dog.clone().label("DogInput")

      const r1 = resolver.of(Dog, {
        unwrap: query(Dog, {
          input: DogInput,
          resolve: (data) => data,
        }),
        dog: query(Dog, {
          input: { data: DogInput },
          resolve: ({ data }) => data,
        }),
        dogs: query(array(Dog.required()), {
          input: {
            data: array(DogInput),
            required: array(DogInput.required()),
            names: array(string().required()),
          },
          resolve: ({ data }) => data,
        }),
        mustDog: query(Dog.required(), {
          input: { data: DogInput.required() },
          resolve: ({ data }) => data,
        }),
        age: field(number(), (dog) => {
          return new Date().getFullYear() - new Date(dog.birthday).getFullYear()
        }),
      })

      expect(printResolver(r1)).toMatchInlineSnapshot(`
        "type Query {
          unwrap(name: String!, birthday: String!): Dog
          dog(data: DogInput): Dog
          dogs(data: [DogInput], required: [DogInput!], names: [String!]): [Dog!]
          mustDog(data: DogInput!): Dog!
        }

        """Dog Type"""
        type Dog {
          name: String!
          birthday: String!
          age: Float
        }

        """Dog Type"""
        input DogInput {
          name: String!
          birthday: String!
        }"
      `)
    })

    it("should avoid duplicate enum", () => {
      const Fruit = string().oneOf(["apple", "banana", "orange"]).label("Fruit")
      const r1 = resolver({
        fruit: query(Fruit, () => "apple" as const),
        fruits: query(array(Fruit), () => []),
        mustFruit: query(Fruit.required(), () => "apple" as const),
        mustFruits: query(array(Fruit.required()), () => []),
      })

      expect(printResolver(r1)).toMatchInlineSnapshot(`
        "type Query {
          fruit: Fruit
          fruits: [Fruit]
          mustFruit: Fruit!
          mustFruits: [Fruit!]
        }

        enum Fruit {
          apple
          banana
          orange
        }"
      `)
    })

    it("should avoid duplicate interface", () => {
      const Fruit = object({ color: string() }).label("Fruit")
      const Orange = object({ color: string(), flavor: string() })
        .label("Orange")
        .meta({ interfaces: [Fruit] })

      const Apple = object({ color: string(), flavor: string() })
        .label("Apple")
        .meta({ interfaces: [Fruit.clone()] })

      const r1 = resolver({
        apple: query(Apple, () => ({ flavor: "" })),
        apples: query(array(Apple), () => []),
        orange: query(Orange, () => ({ flavor: "" })),
        oranges: query(array(Orange), () => []),
        mustOrange: query(Orange.required(), () => ({ flavor: "" })),
        mustOranges: query(array(Orange.required()), () => []),
      })

      expect(printResolver(r1)).toMatchInlineSnapshot(`
        "type Query {
          apple: Apple
          apples: [Apple]
          orange: Orange
          oranges: [Orange]
          mustOrange: Orange!
          mustOranges: [Orange!]
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
          flavor: String
        }"
      `)
    })

    it("should avoid duplicate union", () => {
      const Apple = object({ flavor: string() }).label("Apple")
      const Orange = object({ color: string() }).label("Orange")
      const Fruit = union([Apple, Orange]).label("Fruit")

      const r1 = resolver({
        fruit: query(Fruit, () => ({ flavor: "" })),
        fruits: query(array(Fruit), () => []),
        mustFruit: query(Fruit.required(), () => ({ flavor: "" })),
        mustFruits: query(array(Fruit.required()), () => []),
      })
      expect(printResolver(r1)).toMatchInlineSnapshot(`
        "type Query {
          fruit: Fruit
          fruits: [Fruit]
          mustFruit: Fruit!
          mustFruits: [Fruit!]
        }

        union Fruit = Apple | Orange

        type Apple {
          flavor: String
        }

        type Orange {
          color: String
        }"
      `)
    })
  })
})

function printYupSilk(schema: Schema): string {
  return printType(yupSilk(schema).getGraphQLType() as GraphQLNamedType)
}

function printResolver(...resolvers: SilkResolver[]): string {
  const weaver = new SchemaWeaver()
  for (const r of resolvers) weaver.add(r)

  const schema = weaver.weaveGraphQLSchema()
  return printSchema(schema)
}
