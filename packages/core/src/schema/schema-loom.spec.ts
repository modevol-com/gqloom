import {
  GraphQLFloat,
  GraphQLInt,
  GraphQLInterfaceType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
  GraphQLUnionType,
  lexicographicSortSchema,
  printSchema,
  validateSchema,
} from "graphql"
import { describe, expect, it } from "vitest"
import { getGraphQLType, loom, silk } from "../resolver"
import { WEAVER_CONFIG } from "../utils/symbols"
import { ensureInterfaceType } from "./interface"
import { GraphQLSchemaLoom, weave } from "./schema-loom"
import { provideWeaverContext } from "./weaver-context"

const { resolver, query, mutation, field } = loom

describe("GraphQLSchemaLoom", () => {
  it("should weave schema", () => {
    interface IGiraffe {
      name: string
      birthday: Date
      heightInMeters: number
    }

    const Giraffe = silk<IGiraffe>(
      new GraphQLObjectType({
        name: "Giraffe",
        fields: {
          name: { type: new GraphQLNonNull(GraphQLString) },
          birthday: { type: new GraphQLNonNull(GraphQLString) },
          heightInMeters: { type: new GraphQLNonNull(GraphQLFloat) },
        },
      })
    )

    const GiraffeInput = silk<Partial<IGiraffe>>(
      new GraphQLObjectType({
        name: "GiraffeInput",
        fields: {
          name: { type: GraphQLString },
          birthday: { type: GraphQLString },
          heightInMeters: { type: GraphQLFloat },
        },
      })
    )

    const simpleFieldResolver = resolver.of(Giraffe, {
      age: field(silk(GraphQLInt), async (giraffe) => {
        return new Date().getFullYear() - giraffe.birthday.getFullYear()
      }),
      greeting: field(silk(GraphQLString), {
        input: { myName: silk<string | undefined>(GraphQLString) },
        resolve: (giraffe, input) => {
          return `Hello, ${input.myName ?? "my friend"}! My name is ${giraffe.name}.`
        },
      }),
    })

    const simpleResolver = resolver({
      giraffe: query(Giraffe, {
        input: { name: silk(GraphQLString) },
        resolve: (input) => {
          return {
            name: input.name ?? "what's your name?",
            birthday: new Date(),
            heightInMeters: 5,
          }
        },
      }),
      saveGiraffe: mutation(Giraffe, {
        input: GiraffeInput,
        resolve: (input) => {
          return {
            name: input.name ?? "Giraffe",
            birthday: input.birthday ?? new Date(),
            heightInMeters: input.heightInMeters ?? 5,
          }
        },
      }),
      updateGiraffe: mutation(Giraffe, {
        input: { data: GiraffeInput },
        resolve: ({ data }) => {
          return {
            name: data.name ?? "Giraffe",
            birthday: data.birthday ?? new Date(),
            heightInMeters: data.heightInMeters ?? 5,
          }
        },
      }),
      createGiraffe: mutation(Giraffe, {
        input: silk<{ data: Partial<IGiraffe> }>(
          new GraphQLObjectType({
            name: "CreateGiraffeInput",
            fields: {
              data: { type: getGraphQLType(GiraffeInput) },
            },
          })
        ),
        resolve: ({ data }) => {
          return {
            name: data.name ?? "Giraffe",
            birthday: data.birthday ?? new Date(),
            heightInMeters: data.heightInMeters ?? 5,
          }
        },
      }),
    })

    const schema = new GraphQLSchemaLoom()
      .add(simpleResolver)
      .add(simpleFieldResolver)
      .weaveGraphQLSchema()

    const schema2 = weave(simpleResolver, simpleFieldResolver)

    expect(printSchema(lexicographicSortSchema(schema2))).toEqual(
      printSchema(lexicographicSortSchema(schema))
    )

    expect(printSchema(lexicographicSortSchema(schema))).toMatchInlineSnapshot(`
      "type Giraffe {
        age: Int
        birthday: String!
        greeting(myName: String): String
        heightInMeters: Float!
        name: String!
      }

      input GiraffeInput {
        birthday: String
        heightInMeters: Float
        name: String
      }

      type Mutation {
        createGiraffe(data: GiraffeInput): Giraffe
        saveGiraffe(birthday: String, heightInMeters: Float, name: String): Giraffe
        updateGiraffe(data: GiraffeInput): Giraffe
      }

      type Query {
        giraffe(name: String): Giraffe
      }"
    `)
  })

  it("should weave schema for alone object", () => {
    interface IGiraffe {
      name: string
    }
    const Giraffe = silk<IGiraffe>(
      new GraphQLObjectType({
        name: "Giraffe",
        fields: {
          name: { type: new GraphQLNonNull(GraphQLString) },
        },
      })
    )

    const schema = GraphQLSchemaLoom.weave(Giraffe)
    expect(printSchema(lexicographicSortSchema(schema))).toMatchInlineSnapshot(`
      "type Giraffe {
        name: String!
      }"
    `)

    const giraffeResolver = resolver.of(Giraffe, {})
    const schema2 = weave(giraffeResolver)
    expect(
      printSchema(lexicographicSortSchema(schema2))
    ).toMatchInlineSnapshot(`
      "type Giraffe {
        name: String!
      }"
    `)
  })

  it("should classify various inputs", () => {
    const middleware1 = () => 0 as any
    const middleware2 = () => 0 as any
    const resolver1 = resolver.of(silk(GraphQLString), {})
    const resolver2 = resolver.of(silk(GraphQLString), {})
    const weaver1 = {
      vendor: "vendor1",
      getGraphQLType: () => 0 as any,
    }
    const weaver2 = {
      vendor: "vendor2",
      getGraphQLType: () => 0 as any,
    }
    const config1 = {
      [WEAVER_CONFIG]: "gqloom.core.schema",
      vendorWeaver: weaver1,
      weaverContext: {},
    }
    const config2 = {
      [WEAVER_CONFIG]: "gqloom.core.schema",
      vendorWeaver: weaver2,
      weaverContext: {},
    }
    const silk1 = silk(GraphQLString)
    const silk2 = silk(GraphQLString)

    const result = GraphQLSchemaLoom.optionsFrom(
      null as any,
      undefined as any,
      middleware1,
      resolver1,
      weaver1,
      config1,
      silk1,
      middleware2,
      resolver2,
      weaver2,
      config2,
      silk2
    )

    expect(result.middlewares).toEqual(new Set([middleware1, middleware2]))
    expect(result.resolvers).toEqual(new Set([resolver1, resolver2]))
    expect(result.weavers).toEqual(new Set([weaver1, weaver2]))
    expect(result.configs).toEqual(new Set([config1, config2]))
    expect(result.silks).toEqual(new Set([silk1, silk2]))
  })

  it("should avoid duplicate name", () => {
    const Dog1 = silk<{ name: string }>(
      new GraphQLObjectType({
        name: "Dog",
        fields: {
          name: { type: new GraphQLNonNull(GraphQLString) },
        },
      })
    )
    const Dog2 = silk<{ name: string }>(
      new GraphQLObjectType({
        name: "Dog",
        fields: {
          name: { type: new GraphQLNonNull(GraphQLString) },
        },
      })
    )

    const dogResolver = resolver({
      dog1: query(silk(GraphQLString), {
        input: { dog: Dog1 },
        resolve: ({ dog }) => dog.name,
      }),
      dog2: query(silk(GraphQLString), {
        input: { dog: Dog2 },
        resolve: ({ dog }) => dog.name,
      }),
    })

    expect(() => {
      new GraphQLSchemaLoom().add(dogResolver).weaveGraphQLSchema()
    }).toThrowErrorMatchingInlineSnapshot(
      `[Error: Schema must contain uniquely named types but contains multiple types named "Dog".]`
    )
  })

  it("should work with unique object", () => {
    const Dog1 = silk<{ name: string }>(
      new GraphQLObjectType({
        name: "Dog",
        fields: {
          name: { type: new GraphQLNonNull(GraphQLString) },
        },
      })
    )

    const dogResolver = resolver({
      dog1: query(silk(GraphQLString), {
        input: { dog: Dog1 },
        resolve: ({ dog }) => dog.name,
      }),
      dog2: query(silk(GraphQLString), {
        input: { dog: Dog1 },
        resolve: ({ dog }) => dog.name,
      }),
    })

    expect(
      printSchema(new GraphQLSchemaLoom().add(dogResolver).weaveGraphQLSchema())
    ).toMatchInlineSnapshot(`
      "type Query {
        dog1(dog: Dog): String
        dog2(dog: Dog): String
      }

      input Dog {
        name: String!
      }"
    `)
  })

  it("should merge field from multiple resolver", () => {
    const Dog = silk<{ name: string; birthday: string }>(
      new GraphQLObjectType({
        name: "Dog",
        fields: {
          name: { type: new GraphQLNonNull(GraphQLString) },
          birthday: { type: new GraphQLNonNull(GraphQLString) },
        },
      })
    )
    const r1 = resolver.of(Dog, {
      dog: query(Dog, () => {
        return {
          name: "dog1",
          birthday: "2020-01-01",
        }
      }),
      age: field(silk(GraphQLInt), (dog) => {
        return new Date().getFullYear() - new Date(dog.birthday).getFullYear()
      }),
    })

    const r2 = resolver.of(Dog, {
      greeting: field(silk(GraphQLString), (dog) => {
        return `Hello ${dog.name}`
      }),
    })

    const schema = new GraphQLSchemaLoom().add(r1).add(r2).weaveGraphQLSchema()
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type Dog {
        name: String!
        birthday: String!
        age: Int
        greeting: String
      }

      type Query {
        dog: Dog
      }"
    `)
  })

  it("should merge extensions from multiple resolver", () => {
    const Dog = silk<{ name: string; birthday: string }>(
      new GraphQLObjectType({
        name: "Dog",
        fields: {
          name: { type: new GraphQLNonNull(GraphQLString) },
          birthday: { type: new GraphQLNonNull(GraphQLString) },
        },
        extensions: { k0: true },
      })
    )

    const r1 = resolver.of(
      Dog,
      {
        dog: query(Dog, () => {
          return { name: "dog1", birthday: "2020-01-01" }
        }),
      },
      { extensions: { k1: true } }
    )
    const r2 = resolver.of(Dog, {}, { extensions: { k2: true } })

    const schema = GraphQLSchemaLoom.weave(r1, r2)

    const DogType = schema.getType("Dog")
    if (DogType == null) throw new Error("DogType is null")
    expect(DogType.extensions).toEqual({ k0: true, k1: true, k2: true })
  })

  it("should avoid duplicate object", () => {
    const DogType = new GraphQLObjectType({
      name: "Dog",
      fields: {
        name: { type: GraphQLString },
        birthday: { type: GraphQLString },
      },
    })
    const Dog = silk(DogType)

    const d1 = getGraphQLType(Dog)

    expect(d1).toBe(getGraphQLType(Dog))

    const Cat = silk(
      new GraphQLObjectType({
        name: "Cat",
        fields: {
          name: { type: GraphQLString },
          birthday: { type: GraphQLString },
          friend: { type: DogType },
        },
      })
    )

    const r1 = resolver({
      dog: query(Dog, () => ({
        name: "",
        birthday: "2012-12-12",
      })),

      cat: query(Cat, () => ({
        name: "",
        birthday: "2012-12-12",
      })),
    })

    const schema = weave(r1)
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type Query {
        dog: Dog
        cat: Cat
      }

      type Dog {
        name: String
        birthday: String
      }

      type Cat {
        name: String
        birthday: String
        friend: Dog
      }"
    `)
  })

  it("should avoid duplicate object in union", () => {
    const DogType = new GraphQLObjectType({
      name: "Dog",
      fields: {
        name: { type: GraphQLString },
        birthday: { type: GraphQLString },
      },
    })
    const Dog = silk(DogType)

    const d1 = getGraphQLType(Dog)

    expect(d1).toBe(getGraphQLType(Dog))

    const CatType = new GraphQLObjectType({
      name: "Cat",
      fields: {
        name: { type: GraphQLString },
        birthday: { type: GraphQLString },
        friend: { type: DogType },
      },
    })

    const Cat = silk(CatType)

    const Animal = silk(
      new GraphQLUnionType({
        name: "Animal",
        types: [DogType, CatType],
      })
    )

    const r1 = resolver({
      dog: query(Dog, () => ({
        name: "",
        birthday: "2012-12-12",
      })),

      cat: query(Cat, () => ({
        name: "",
        birthday: "2012-12-12",
      })),

      animal: query(Animal, () => ({
        name: "",
        birthday: "2012-12-12",
      })),
    })

    const schema = weave(r1)
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type Query {
        dog: Dog
        cat: Cat
        animal: Animal
      }

      type Dog {
        name: String
        birthday: String
      }

      type Cat {
        name: String
        birthday: String
        friend: Dog
      }

      union Animal = Dog | Cat"
    `)
  })

  it("should avoid duplicate object in interface", () => {
    const weaver = new GraphQLSchemaLoom()

    const MasterType = new GraphQLObjectType({
      name: "Master",
      fields: { name: { type: GraphQLString } },
    })

    const AnimalType = new GraphQLObjectType({
      name: "Animal",
      fields: {
        name: { type: GraphQLString },
        master: { type: MasterType },
        birthday: { type: GraphQLString },
      },
    })

    const AnimalInterface = provideWeaverContext(
      () => ensureInterfaceType(AnimalType),
      weaver.context
    )

    const DogType = new GraphQLObjectType({
      name: "Dog",
      fields: {
        name: { type: GraphQLString },
        master: { type: MasterType },
        birthday: { type: GraphQLString },
      },
      interfaces: () => [AnimalInterface],
    })

    const Dog = silk(DogType)

    const r1 = resolver({
      dog: query(Dog, () => ({})),
    })

    const schema = weaver.add(r1).weaveGraphQLSchema()
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type Query {
        dog: Dog
      }

      type Dog implements Animal {
        name: String
        master: Master
        birthday: String
      }

      interface Animal {
        name: String
        master: Master
        birthday: String
      }

      type Master {
        name: String
      }"
    `)
  })

  describe("interface sharing object types with the woven graph", () => {
    const createTypes = () => {
      const Inner = new GraphQLObjectType({
        name: "Inner",
        fields: { value: { type: GraphQLString } },
      })
      const Outer = new GraphQLObjectType({
        name: "Outer",
        fields: { inner: { type: new GraphQLNonNull(Inner) } },
      })
      const Woven = new GraphQLObjectType({
        name: "Woven",
        fields: { inner: { type: new GraphQLNonNull(Inner) } },
      })
      const Node = new GraphQLInterfaceType({
        name: "Node",
        fields: () => ({
          id: { type: new GraphQLNonNull(GraphQLString) },
          outer: { type: Outer },
        }),
      })
      const Impl = new GraphQLObjectType({
        name: "Impl",
        interfaces: [Node],
        fields: {
          id: { type: new GraphQLNonNull(GraphQLString) },
          outer: { type: Outer },
        },
      })
      return { Inner, Outer, Woven, Node, Impl }
    }

    it("should avoid duplicate nested object between a raw interface and the woven graph", () => {
      const { Impl, Woven } = createTypes()

      const schema = weave(
        resolver({
          impl: query(silk<{ id: string }>(Impl), () => ({ id: "1" })),
          woven: query(silk<{ inner: object }>(Woven), () => ({ inner: {} })),
        })
      )

      expect(validateSchema(schema)).toEqual([])
      expect(
        printSchema(lexicographicSortSchema(schema))
      ).toMatchInlineSnapshot(`
        "type Impl implements Node {
          id: String!
          outer: Outer
        }

        type Inner {
          value: String
        }

        interface Node {
          id: String!
          outer: Outer
        }

        type Outer {
          inner: Inner!
        }

        type Query {
          impl: Impl
          woven: Woven
        }

        type Woven {
          inner: Inner!
        }"
      `)
    })

    it("should use the same object for the interface field and the woven field", () => {
      const { Impl, Woven } = createTypes()

      const schema = weave(
        resolver({
          impl: query(silk<{ id: string }>(Impl), () => ({ id: "1" })),
          woven: query(silk<{ inner: object }>(Woven), () => ({ inner: {} })),
        })
      )

      const node = schema.getType("Node") as GraphQLInterfaceType
      const outerFromInterface = node.getFields().outer.type
      const outer = schema.getType("Outer") as GraphQLObjectType
      expect(outerFromInterface).toBe(outer)

      const woven = schema.getType("Woven") as GraphQLObjectType
      const innerFromWoven = (
        woven.getFields().inner.type as GraphQLNonNull<any>
      ).ofType
      const innerFromOuter = (
        outer.getFields().inner.type as GraphQLNonNull<any>
      ).ofType
      expect(innerFromWoven).toBe(schema.getType("Inner"))
      expect(innerFromOuter).toBe(schema.getType("Inner"))
    })

    it("should keep one interface instance for implementors and queries", () => {
      const { Node, Impl, Outer } = createTypes()
      const OtherImpl = new GraphQLObjectType({
        name: "OtherImpl",
        interfaces: [Node],
        fields: {
          id: { type: new GraphQLNonNull(GraphQLString) },
          outer: { type: Outer },
        },
      })

      const schema = weave(
        resolver({
          node: query(silk<{ id: string }>(Node), () => ({ id: "1" })),
          impl: query(silk<{ id: string }>(Impl), () => ({ id: "1" })),
          other: query(silk<{ id: string }>(OtherImpl), () => ({ id: "1" })),
        })
      )

      expect(validateSchema(schema)).toEqual([])
      const node = schema.getType("Node")
      expect(node).toBeInstanceOf(GraphQLInterfaceType)
      expect(schema.getQueryType()?.getFields().node.type).toBe(node)
      for (const name of ["Impl", "OtherImpl"]) {
        const implementor = schema.getType(name) as GraphQLObjectType
        expect(implementor.getInterfaces()).toHaveLength(1)
        expect(implementor.getInterfaces()[0]).toBe(node)
      }
    })

    it("should avoid duplicate nested object in an interface created by ensureInterfaceType", () => {
      const { Inner, Outer, Woven } = createTypes()
      const weaver = new GraphQLSchemaLoom()

      const NodeObject = new GraphQLObjectType({
        name: "Node",
        fields: {
          id: { type: new GraphQLNonNull(GraphQLString) },
          outer: { type: Outer },
        },
      })
      const NodeInterface = provideWeaverContext(
        () => ensureInterfaceType(NodeObject),
        weaver.context
      )
      const Impl = new GraphQLObjectType({
        name: "Impl",
        interfaces: () => [NodeInterface],
        fields: {
          id: { type: new GraphQLNonNull(GraphQLString) },
          outer: { type: Outer },
        },
      })

      const schema = weaver
        .add(
          resolver({
            impl: query(silk<{ id: string }>(Impl), () => ({ id: "1" })),
            woven: query(silk<{ inner: object }>(Woven), () => ({
              inner: {},
            })),
          })
        )
        .weaveGraphQLSchema()

      expect(validateSchema(schema)).toEqual([])
      expect(
        Object.values(schema.getTypeMap()).filter((it) => it.name === "Inner")
      ).toHaveLength(1)
      expect(schema.getType("Inner")).not.toBe(Inner)
      expect(schema.getType("Node")).toBe(NodeInterface)
    })

    it("should intern an interface created by ensureInterfaceType outside a weave", () => {
      const { Inner, Outer, Woven } = createTypes()

      const NodeObject = new GraphQLObjectType({
        name: "Node",
        fields: {
          id: { type: new GraphQLNonNull(GraphQLString) },
          outer: { type: Outer },
        },
      })
      const NodeInterface = ensureInterfaceType(NodeObject)
      const Impl = new GraphQLObjectType({
        name: "Impl",
        interfaces: () => [NodeInterface],
        fields: {
          id: { type: new GraphQLNonNull(GraphQLString) },
          outer: { type: Outer },
        },
      })

      const schema = weave(
        resolver({
          impl: query(silk<{ id: string }>(Impl), () => ({ id: "1" })),
          woven: query(silk<{ inner: object }>(Woven), () => ({
            inner: {},
          })),
        })
      )

      expect(validateSchema(schema)).toEqual([])
      expect(
        Object.values(schema.getTypeMap()).filter((it) => it.name === "Inner")
      ).toHaveLength(1)
      expect(schema.getType("Inner")).not.toBe(Inner)
      expect(schema.getType("Node")).not.toBe(NodeInterface)
      expect(
        (schema.getType("Impl") as GraphQLObjectType).getInterfaces()[0]
      ).toBe(schema.getType("Node"))
    })

    it("should not share interned interfaces across independent weaves", () => {
      const { Impl, Woven, Node } = createTypes()
      const build = () =>
        weave(
          resolver({
            impl: query(silk<{ id: string }>(Impl), () => ({ id: "1" })),
            woven: query(silk<{ inner: object }>(Woven), () => ({
              inner: {},
            })),
          })
        )

      const schema1 = build()
      const schema2 = build()

      expect(validateSchema(schema1)).toEqual([])
      expect(validateSchema(schema2)).toEqual([])
      expect(schema1.getType("Node")).not.toBe(Node)
      expect(schema2.getType("Node")).not.toBe(Node)
      expect(schema1.getType("Node")).not.toBe(schema2.getType("Node"))
      expect(schema1.getType("Inner")).not.toBe(schema2.getType("Inner"))
    })

    it("should support an interface implementing another interface", () => {
      const { Outer, Woven } = createTypes()
      const Entity = new GraphQLInterfaceType({
        name: "Entity",
        fields: { id: { type: new GraphQLNonNull(GraphQLString) } },
      })
      const Node = new GraphQLInterfaceType({
        name: "Node",
        interfaces: [Entity],
        fields: () => ({
          id: { type: new GraphQLNonNull(GraphQLString) },
          outer: { type: Outer },
        }),
      })
      const Impl = new GraphQLObjectType({
        name: "Impl",
        interfaces: [Node, Entity],
        fields: {
          id: { type: new GraphQLNonNull(GraphQLString) },
          outer: { type: Outer },
        },
      })

      const schema = weave(
        resolver({
          impl: query(silk<{ id: string }>(Impl), () => ({ id: "1" })),
          woven: query(silk<{ inner: object }>(Woven), () => ({ inner: {} })),
        })
      )

      expect(validateSchema(schema)).toEqual([])
      expect(
        printSchema(lexicographicSortSchema(schema))
      ).toMatchInlineSnapshot(`
        "interface Entity {
          id: String!
        }

        type Impl implements Entity & Node {
          id: String!
          outer: Outer
        }

        type Inner {
          value: String
        }

        interface Node implements Entity {
          id: String!
          outer: Outer
        }

        type Outer {
          inner: Inner!
        }

        type Query {
          impl: Impl
          woven: Woven
        }

        type Woven {
          inner: Inner!
        }"
      `)
    })

    it("should handle an interface referencing its implementor", () => {
      const Node: GraphQLInterfaceType = new GraphQLInterfaceType({
        name: "Node",
        fields: () => ({
          id: { type: new GraphQLNonNull(GraphQLString) },
          parent: { type: Impl },
        }),
      })
      const Impl: GraphQLObjectType = new GraphQLObjectType({
        name: "Impl",
        interfaces: () => [Node],
        fields: () => ({
          id: { type: new GraphQLNonNull(GraphQLString) },
          parent: { type: Impl },
        }),
      })

      const schema = weave(
        resolver({
          node: query(silk<{ id: string }>(Node), () => ({ id: "1" })),
        })
      )

      expect(validateSchema(schema)).toEqual([])
      expect(
        printSchema(lexicographicSortSchema(schema))
      ).toMatchInlineSnapshot(`
        "type Impl implements Node {
          id: String!
          parent: Impl
        }

        interface Node {
          id: String!
          parent: Impl
        }

        type Query {
          node: Node
        }"
      `)
    })

    it("should preserve the config of the interface", () => {
      const resolveType = () => "Impl"
      const Node = new GraphQLInterfaceType({
        name: "Node",
        description: "Something with an id",
        resolveType,
        extensions: { custom: true },
        fields: {
          id: {
            type: new GraphQLNonNull(GraphQLString),
            description: "The id",
            deprecationReason: "Use something else",
          },
        },
      })
      const Impl = new GraphQLObjectType({
        name: "Impl",
        interfaces: [Node],
        fields: { id: { type: new GraphQLNonNull(GraphQLString) } },
      })

      const schema = weave(
        resolver({
          impl: query(silk<{ id: string }>(Impl), () => ({ id: "1" })),
        })
      )

      const node = schema.getType("Node") as GraphQLInterfaceType
      expect(node.description).toBe("Something with an id")
      expect(node.resolveType).toBe(resolveType)
      expect(node.extensions).toEqual({ custom: true })
      expect(node.getFields().id.description).toBe("The id")
      expect(node.getFields().id.deprecationReason).toBe("Use something else")
    })

    it("should avoid duplicate raw types passed by config.types", () => {
      const Animal = new GraphQLInterfaceType({
        name: "Animal",
        fields: { name: { type: GraphQLString } },
      })
      const Cat = new GraphQLObjectType({
        name: "Cat",
        interfaces: [Animal],
        fields: { name: { type: GraphQLString } },
      })

      const schema = weave(
        resolver({
          animal: query(silk<{ name: string }>(Animal), () => ({
            name: "Tom",
          })),
        }),
        GraphQLSchemaLoom.config({ types: [Cat] })
      )

      expect(validateSchema(schema)).toEqual([])
      expect(
        printSchema(lexicographicSortSchema(schema))
      ).toMatchInlineSnapshot(`
        "interface Animal {
          name: String
        }

        type Cat implements Animal {
          name: String
        }

        type Query {
          animal: Animal
        }"
      `)
    })

    it("should merge config.types with other types of the schema", () => {
      const Extra = silk<{ name: string }>(
        new GraphQLObjectType({
          name: "Extra",
          fields: { name: { type: GraphQLString } },
        })
      )
      const Other = new GraphQLObjectType({
        name: "Other",
        fields: { name: { type: GraphQLString } },
      })

      const schema = weave(
        resolver({
          hello: query(silk(GraphQLString), () => "hello"),
        }),
        Extra,
        GraphQLSchemaLoom.config({ types: [Other] })
      )

      expect(schema.getType("Extra")).toBeDefined()
      expect(schema.getType("Other")).toBeDefined()
    })
  })
})
