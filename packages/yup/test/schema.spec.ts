import {
  field,
  type GQLoomExtensions,
  getGraphQLType as getGraphQLTypeCore,
  initWeaverContext,
  type Loom,
  provideWeaverContext,
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
  array,
  boolean,
  date,
  type InferType,
  mixed,
  number,
  object,
  type Schema,
  string,
} from "yup"
import { type GQLoomMetadata, union, YupWeaver, yupSilk } from "../src/index"

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
    expect(getGraphQLType(boolean())).toEqual(GraphQLBoolean)
    expect(getGraphQLType(number())).toEqual(GraphQLFloat)
    expect(getGraphQLType(number().integer())).toEqual(GraphQLInt)
  })

  it("should keep default value in extensions", () => {
    const objectType = object({
      foo: string().optional().default("foo"),
    }).label("ObjectType")

    const objectSilk = objectType
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

    const objectE1Silk = objectE1Type
    const objectE1GqlType = getGraphQLType(objectE1Silk) as GraphQLObjectType

    expect(objectE1GqlType.getFields().foo).toMatchObject({
      extensions: { defaultValue: fooGetter },
    })
  })

  it("should handle custom type", () => {
    expect(
      getGraphQLType(date().meta({ asField: { type: () => GraphQLDate } }))
    ).toEqual(GraphQLDate)
  })

  it("should handle hidden field", () => {
    const Dog1 = object({
      name: string(),
      birthday: date().meta({ asField: { type: null } }),
    }).label("Dog")

    expect(print(Dog1)).toMatchInlineSnapshot(`
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
        dog: Dog
      }"
    `)

    const Dog2 = object({
      name: string(),
      birthday: date().meta({ asField: { type: field.hidden } }),
    }).label("Dog")

    const r2 = resolver.of(Dog2, {
      dog: query(Dog2, () => ({})),
    })

    expect(printResolver(r2)).toMatchInlineSnapshot(`
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

    const r1 = resolver({ dog: query(Dog, () => ({})) })
    const schema1 = weave(YupWeaver, r1, config)

    const r2 = resolver({ dog: query(Dog, () => ({})) })
    const schema2 = weave(YupWeaver.config(config), YupWeaver, r2)

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
    const s = getGraphQLType(string().required())
    expect(s).toBeInstanceOf(GraphQLNonNull)
    expect(s).toMatchObject({ ofType: GraphQLString })

    const b = getGraphQLType(boolean().required())
    expect(b).toBeInstanceOf(GraphQLNonNull)
    expect(b).toMatchObject({ ofType: GraphQLBoolean })

    const f = getGraphQLType(number().required())
    expect(f).toBeInstanceOf(GraphQLNonNull)
    expect(f).toMatchObject({ ofType: GraphQLFloat })

    const i = getGraphQLType(number().required().integer())
    expect(i).toBeInstanceOf(GraphQLNonNull)
    expect(i).toMatchObject({ ofType: GraphQLInt })

    const d = getGraphQLType(
      date()
        .meta({ asField: { type: () => GraphQLDate } })
        .required()
    )
    expect(d).toBeInstanceOf(GraphQLNonNull)
    expect(d).toMatchObject({ ofType: GraphQLDate })
  })

  it("should handle array", () => {
    const s = getGraphQLType(array().of(string()))
    expect(s).toBeInstanceOf(GraphQLList)
    expect(s).toMatchObject({ ofType: GraphQLString })

    const b = getGraphQLType(array().of(boolean()))
    expect(b).toBeInstanceOf(GraphQLList)
    expect(b).toMatchObject({ ofType: GraphQLBoolean })

    const f = getGraphQLType(array(number()))
    expect(f).toBeInstanceOf(GraphQLList)
    expect(f).toMatchObject({ ofType: GraphQLFloat })

    const i = getGraphQLType(array(number().integer()))
    expect(i).toBeInstanceOf(GraphQLList)
    expect(i).toMatchObject({ ofType: GraphQLInt })

    const d = getGraphQLType(
      array(date().meta({ asField: { type: () => GraphQLDate } }))
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

    expect(print(Giraffe)).toMatchInlineSnapshot(`
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

    expect(print(fruitM)).toEqual(print(fruitS))
    expect(print(fruitE)).toEqual(print(fruitM))
    expect(print(fruitE)).toMatchInlineSnapshot(`
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
      .meta({ asObjectType: { interfaces: [Fruit] } })
      .label("Orange")

    const simpleResolver = resolver({
      orange: query(Orange, () => 0 as any),
    })

    expect(print(Orange)).toMatchInlineSnapshot(`
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
            names: array(string().required()).required(),
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
        .meta({ asObjectType: { interfaces: [Fruit] } })

      const Apple = object({ color: string(), flavor: string() })
        .label("Apple")
        .meta({ asObjectType: { interfaces: [Fruit.clone()] } })

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

function getGraphQLType(schema: Schema) {
  const context = initWeaverContext()
  context.vendorWeavers.set(YupWeaver.vendor, YupWeaver)
  return provideWeaverContext(() => getGraphQLTypeCore(schema), context)
}

function print(schema: Schema): string {
  return printType(getGraphQLType(schema) as GraphQLNamedType)
}

function printResolver(...resolvers: Loom.Resolver[]): string {
  const schema = weave(YupWeaver, ...resolvers)
  return printSchema(schema)
}
