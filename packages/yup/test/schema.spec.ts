import {
  type GQLoomExtensions,
  type Loom,
  field,
  getGraphQLType,
  query,
  resolver,
  weave,
} from "@gqloom/core"
import {
  GraphQLBoolean,
  type GraphQLEnumValueConfig,
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  type GraphQLNamedType,
  GraphQLNonNull,
  type GraphQLObjectType,
  GraphQLScalarType,
  GraphQLString,
  printSchema,
  printType,
} from "graphql"
import { describe, expect, expectTypeOf, it } from "vitest"
import {
  type InferType,
  type Schema,
  array,
  boolean,
  date,
  mixed,
  number,
  object,
  string,
} from "yup"
import { type GQLoomMetadata, YupWeaver, union, yupSilk } from "../src/index"

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

describe("YupWeaver", () => {
  it("should handle scalar", () => {
    expect(getGraphQLType(yupSilk(string()))).toEqual(GraphQLString)
    expect(getGraphQLType(yupSilk(boolean()))).toEqual(GraphQLBoolean)
    expect(getGraphQLType(yupSilk(number()))).toEqual(GraphQLFloat)
    expect(getGraphQLType(yupSilk(number().integer()))).toEqual(GraphQLInt)
  })

  it("should keep default value in extensions", () => {
    const objectType = object({
      foo: string().optional().default("foo"),
    }).label("ObjectType")

    const objectSilk = yupSilk(objectType)
    const objectGqlType = getGraphQLType(objectSilk) as GraphQLObjectType

    expect(objectGqlType.getFields().foo).toMatchObject({
      extensions: { defaultValue: "foo" },
    })

    const fooGetter = () => "foo"

    const objectE1Type = object({
      foo: string()
        .optional()
        .default("foo")
        .meta({ asField: { extensions: { defaultValue: fooGetter } } }),
    }).label("ObjectType")

    const objectE1Silk = yupSilk(objectE1Type)
    const objectE1GqlType = getGraphQLType(objectE1Silk) as GraphQLObjectType

    expect(objectE1GqlType.getFields().foo).toMatchObject({
      extensions: { defaultValue: fooGetter },
    })
  })

  it("should handle custom type", () => {
    expect(
      getGraphQLType(
        yupSilk(date().meta({ asField: { type: () => GraphQLDate } }))
      )
    ).toEqual(GraphQLDate)
  })

  it("should handle hidden field", () => {
    const Dog = yupSilk(
      object({
        name: string(),
        birthday: date().meta({ asField: { type: null } }),
      }).label("Dog")
    )

    expect(printYupSilk(Dog)).toMatchInlineSnapshot(`
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
        dog: Dog
      }"
    `)
  })

  it("should handle preset GraphQLType", () => {
    const Dog = object({
      name: string(),
      birthday: date(),
    }).label("Dog")

    const config = YupWeaver.config({
      presetGraphQLType: (description) => {
        switch (description.type) {
          case "date":
            return GraphQLDate
        }
      },
    })

    const r1 = resolver({ dog: query(yupSilk(Dog), () => ({})) })
    const schema1 = weave(r1, config)

    const ySilk = YupWeaver.useConfig(config)
    const r2 = resolver({ dog: query(ySilk(Dog), () => ({})) })
    const schema2 = weave(r2)

    expect(printSchema(schema2)).toEqual(printSchema(schema1))

    expect(printSchema(schema1)).toMatchInlineSnapshot(`
      "type Query {
        dog: Dog
      }

      type Dog {
        name: String
        birthday: Date
      }

      scalar Date"
    `)
  })

  it("should handle non null", () => {
    const s = getGraphQLType(yupSilk(string().required()))
    expect(s).toBeInstanceOf(GraphQLNonNull)
    expect(s).toMatchObject({ ofType: GraphQLString })

    const b = getGraphQLType(yupSilk(boolean().required()))
    expect(b).toBeInstanceOf(GraphQLNonNull)
    expect(b).toMatchObject({ ofType: GraphQLBoolean })

    const f = getGraphQLType(yupSilk(number().required()))
    expect(f).toBeInstanceOf(GraphQLNonNull)
    expect(f).toMatchObject({ ofType: GraphQLFloat })

    const i = getGraphQLType(yupSilk(number().required().integer()))
    expect(i).toBeInstanceOf(GraphQLNonNull)
    expect(i).toMatchObject({ ofType: GraphQLInt })

    const d = getGraphQLType(
      yupSilk(
        date()
          .meta({ asField: { type: () => GraphQLDate } })
          .required()
      )
    )
    expect(d).toBeInstanceOf(GraphQLNonNull)
    expect(d).toMatchObject({ ofType: GraphQLDate })
  })

  it("should handle array", () => {
    const s = getGraphQLType(yupSilk(array().of(string())))
    expect(s).toBeInstanceOf(GraphQLList)
    expect(s).toMatchObject({ ofType: GraphQLString })

    const b = getGraphQLType(yupSilk(array().of(boolean())))
    expect(b).toBeInstanceOf(GraphQLList)
    expect(b).toMatchObject({ ofType: GraphQLBoolean })

    const f = getGraphQLType(yupSilk(array(number())))
    expect(f).toBeInstanceOf(GraphQLList)
    expect(f).toMatchObject({ ofType: GraphQLFloat })

    const i = getGraphQLType(yupSilk(array(number().integer())))
    expect(i).toBeInstanceOf(GraphQLList)
    expect(i).toMatchObject({ ofType: GraphQLInt })

    const d = getGraphQLType(
      yupSilk(array(date().meta({ asField: { type: () => GraphQLDate } })))
    )
    expect(d).toBeInstanceOf(GraphQLList)
    expect(d).toMatchObject({ ofType: GraphQLDate })
  })

  it("should handle object", () => {
    const Giraffe = object({
      name: string().required(),
      birthday: date()
        .required()
        .meta({ asField: { type: () => GraphQLDate } }),
      height: number().meta({
        asField: {
          description: "The giraffe's height in meters",
        },
      }),
      hobbies: array(string().required()),
      friends: array(string()).required(),
    })
      .label("Giraffe")
      .meta({ asObjectType: { description: "A giraffe" } })

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
    const enumValueDescriptions: Record<string, GraphQLEnumValueConfig> = {
      apple: { description: "Apple is red" },
      banana: { description: "Banana is yellow" },
      orange: { description: "Orange is orange" },
    }
    const fruitS = string()
      .oneOf(["apple", "banana", "orange"])
      .label("Fruit")
      .meta({
        asEnumType: {
          description: "Some fruits you might like",
          valuesConfig: enumValueDescriptions,
        },
      })

    type Fruit1 = InferType<typeof fruitS>
    expectTypeOf<Fruit1>().toEqualTypeOf<
      "apple" | "banana" | "orange" | undefined
    >()

    const fruitM = mixed<"apple" | "banana" | "orange">()
      .oneOf(["apple", "banana", "orange"])
      .label("Fruit")
      .meta({
        asEnumType: {
          description: "Some fruits you might like",
          valuesConfig: enumValueDescriptions,
        },
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
        asEnumType: {
          enum: Fruit,
          description: "Some fruits you might like",
          valuesConfig: enumValueDescriptions,
        },
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

    const Orange = yupSilk(
      object({
        name: string().required(),
        color: string().required(),
        prize: number().required(),
      })
    )
      .meta({ asObjectType: { interfaces: [Fruit] } })
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

    const Animal = yupSilk(
      union([Cat, Dog])
        .label("Animal")
        .meta({ description: "Do you love animals ?" })
    )

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
      const Dog = yupSilk(
        object({
          name: string().required(),
          birthday: string().required(),
        }).label("Dog")
      )

      const r1 = resolver.of(Dog, {
        dog: query(Dog, () => ({ name: "", birthday: "2012-12-12" })),
        age: field(yupSilk(number()), (dog) => {
          return new Date().getFullYear() - new Date(dog.birthday).getFullYear()
        }),
      })

      const r2 = resolver.of(Dog, {
        greeting: field(yupSilk(string()), (dog) => {
          return `Hello ${dog.name}`
        }),
      })

      expect(printResolver(r1, r2)).toMatchInlineSnapshot(`
        "type Dog {
          name: String!
          birthday: String!
          age: Float
          greeting: String
        }

        type Query {
          dog: Dog
        }"
      `)
    })

    it("should avoid duplicate object", () => {
      const Dog = yupSilk(
        object({
          name: string().required(),
          birthday: string().required(),
        }).label("Dog")
      )

      const r1 = resolver.of(Dog, {
        dog: query(Dog, () => ({ name: "", birthday: "2012-12-12" })),
        dogs: query(yupSilk(array(Dog)), {
          resolve: () => [
            { name: "Fido", birthday: "2012-12-12" },
            { name: "Rover", birthday: "2012-12-12" },
          ],
        }),
        mustDog: query(yupSilk(Dog.required()), () => ({
          name: "",
          birthday: "2012-12-12",
        })),
        mustDogs: query(yupSilk(array(Dog.required())), () => []),
        age: field(yupSilk(number()), (dog) => {
          return new Date().getFullYear() - new Date(dog.birthday).getFullYear()
        }),
      })

      expect(printResolver(r1)).toMatchInlineSnapshot(`
        "type Dog {
          name: String!
          birthday: String!
          age: Float
        }

        type Query {
          dog: Dog
          dogs: [Dog]
          mustDog: Dog!
          mustDogs: [Dog!]
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

      const r1 = resolver.of(yupSilk(Dog), {
        unwrap: query(yupSilk(Dog), {
          input: yupSilk(DogInput),
          resolve: (data) => data,
        }),
        dog: query(yupSilk(Dog), {
          input: { data: yupSilk(DogInput) },
          resolve: ({ data }) => data,
        }),
        dogs: query(yupSilk(array(Dog.required())), {
          input: {
            data: yupSilk(array(DogInput)),
            required: yupSilk(array(DogInput.required())),
            names: yupSilk(array(string().required()).required()),
          },
          resolve: ({ data }) => data,
        }),
        mustDog: query(yupSilk(Dog.required()), {
          input: { data: yupSilk(DogInput.required()) },
          resolve: ({ data }) => data,
        }),
        age: field(yupSilk(number()), (dog) => {
          return new Date().getFullYear() - new Date(dog.birthday).getFullYear()
        }),
      })

      expect(printResolver(r1)).toMatchInlineSnapshot(`
        """"Dog Type"""
        type Dog {
          name: String!
          birthday: String!
          age: Float
        }

        type Query {
          unwrap(name: String!, birthday: String!): Dog
          dog(data: DogInput): Dog
          dogs(data: [DogInput], required: [DogInput!], names: [String!]!): [Dog!]
          mustDog(data: DogInput!): Dog!
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
        fruit: query(yupSilk(Fruit), () => "apple" as const),
        fruits: query(yupSilk(array(Fruit)), () => []),
        mustFruit: query(yupSilk(Fruit.required()), () => "apple" as const),
        mustFruits: query(yupSilk(array(Fruit.required())), () => []),
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
        .meta({ asObjectType: { interfaces: [Fruit] } })

      const Apple = object({ color: string(), flavor: string() })
        .label("Apple")
        .meta({ asObjectType: { interfaces: [Fruit.clone()] } })

      const r1 = resolver({
        apple: query(yupSilk(Apple), () => ({ flavor: "" })),
        apples: query(yupSilk(array(Apple)), () => []),
        orange: query(yupSilk(Orange), () => ({ flavor: "" })),
        oranges: query(yupSilk(array(Orange)), () => []),
        mustOrange: query(yupSilk(Orange.required()), () => ({ flavor: "" })),
        mustOranges: query(yupSilk(array(Orange.required())), () => []),
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
        fruit: query(yupSilk(Fruit), () => ({ flavor: "" })),
        fruits: query(yupSilk(array(Fruit)), () => []),
        mustFruit: query(yupSilk(Fruit.required()), () => ({ flavor: "" })),
        mustFruits: query(yupSilk(array(Fruit.required())), () => []),
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
  return printType(getGraphQLType(yupSilk(schema)) as GraphQLNamedType)
}

function printResolver(...resolvers: Loom.Resolver[]): string {
  const schema = weave(...resolvers)
  return printSchema(schema)
}
