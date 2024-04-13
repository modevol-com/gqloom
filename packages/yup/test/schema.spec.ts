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
  mutation,
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
} from "graphql"
import { SchemaWeaver, type SilkResolver } from "@gqloom/core"

declare module "yup" {
  export interface CustomSchemaMetadata extends GQLoomMetadata {}
}

describe("YupSilk", () => {
  it("should handle Scalar", () => {
    expect(yupSilk(string()).getType()).toEqual(GraphQLString)
    expect(yupSilk(boolean()).getType()).toEqual(GraphQLBoolean)
    expect(yupSilk(number()).getType()).toEqual(GraphQLFloat)
    expect(yupSilk(number().integer()).getType()).toEqual(GraphQLInt)
  })

  it("should handle non null Scalar", () => {
    const s = yupSilk(string().required()).getType()
    expect(s).toBeInstanceOf(GraphQLNonNull)
    expect(s).toMatchObject({ ofType: GraphQLString })

    const b = yupSilk(boolean().required()).getType()
    expect(b).toBeInstanceOf(GraphQLNonNull)
    expect(b).toMatchObject({ ofType: GraphQLBoolean })

    const f = yupSilk(number().required()).getType()
    expect(f).toBeInstanceOf(GraphQLNonNull)
    expect(f).toMatchObject({ ofType: GraphQLFloat })

    const i = yupSilk(number().required().integer()).getType()
    expect(i).toBeInstanceOf(GraphQLNonNull)
    expect(i).toMatchObject({ ofType: GraphQLInt })
  })

  it("should handle array", () => {
    const s = yupSilk(array().of(string())).getType()
    expect(s).toBeInstanceOf(GraphQLList)
    expect(s).toMatchObject({ ofType: GraphQLString })

    const b = yupSilk(array().of(boolean())).getType()
    expect(b).toBeInstanceOf(GraphQLList)
    expect(b).toMatchObject({ ofType: GraphQLBoolean })

    const f = yupSilk(array(number())).getType()
    expect(f).toBeInstanceOf(GraphQLList)
    expect(f).toMatchObject({ ofType: GraphQLFloat })

    const i = yupSilk(array(number().integer())).getType()
    expect(i).toBeInstanceOf(GraphQLList)
    expect(i).toMatchObject({ ofType: GraphQLInt })
  })

  it("should handle Object", () => {
    const Giraffe = object({
      name: string().required(),
      birthday: date().required(),
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
        birthday: String!

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

  describe.todo("should avoid duplicate objects", () => {
    it("should merge field from multiple resolver")

    it("should avoid duplicate object")

    it("should avoid duplicate input")

    it("should avoid duplicate enum")

    it("should avoid duplicate interface")

    it("should avoid duplicate union")
  })
})

describe.skip("yup resolver", () => {
  const Giraffe = object({
    name: string().required(),
    birthday: date().required(),
    heightInMeters: number().required(),
  })

  const GiraffeInput = object().concat(Giraffe).partial()

  const createGiraffe = mutation(Giraffe, {
    input: GiraffeInput,
    resolve: (data) => ({
      name: data.name ?? "Giraffe",
      birthday: data.birthday ?? new Date(),
      heightInMeters: data.heightInMeters ?? 5,
    }),
  })

  const simpleGiraffeResolver = resolver({
    createGiraffe: createGiraffe,
  })

  const giraffeResolver = resolver.of(Giraffe, {
    age: field(number(), async (giraffe) => {
      return new Date().getFullYear() - giraffe.birthday.getFullYear()
    }),

    giraffe: query(Giraffe, {
      input: { name: string().required() },
      resolve: ({ name }) => ({
        name,
        birthday: new Date(),
        heightInMeters: 5,
      }),
    }),

    greeting: field(string(), {
      input: { myName: string() },
      resolve: (giraffe, { myName }) =>
        `Hello, ${myName ?? "my friend"}! My name is ${giraffe.name}.`,
    }),
  })

  giraffeResolver.giraffe.resolve({ name: "Giraffe" })
  simpleGiraffeResolver.createGiraffe.resolve({})
})

function printYupSilk(schema: Schema): string {
  return printType(yupSilk(schema).getType() as GraphQLNamedType)
}

function printResolver(resolver: SilkResolver): string {
  const schema = new SchemaWeaver().add(resolver).weaveGraphQLSchema()
  return printSchema(schema)
}
