import type { Loom, SchemaWeaver } from "@gqloom/core"
import {
  field,
  type GQLoomExtensions,
  mutation,
  query,
  resolver,
  weave,
} from "@gqloom/core"
import { Option, Schema, SchemaAST } from "effect"
import {
  execute,
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLInterfaceType,
  GraphQLList,
  type GraphQLNamedType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLString,
  parse,
  printSchema,
  printType,
} from "graphql"
import { describe, expect, expectTypeOf, it } from "vitest"
import { asField, EffectWeaver } from "../src"

declare module "graphql" {
  export interface GraphQLObjectTypeExtensions extends GQLoomExtensions {}

  export interface GraphQLFieldExtensions<_TSource, _TContext, _TArgs = any>
    extends GQLoomExtensions {}
}

const GraphQLDate = new GraphQLScalarType<Date, string>({
  name: "Date",
})

const standard = Schema.standardSchemaV1

// Helper function to print a schema type
function print(schema: Schema.Schema.Any): string {
  let gqlType = EffectWeaver.getGraphQLType(schema)
  while ("ofType" in gqlType) gqlType = gqlType.ofType
  return printType(gqlType as GraphQLNamedType)
}

// Helper function to print resolver schema
function printResolver(...resolvers: Loom.Resolver[]): string {
  const schema = weave(EffectWeaver, ...resolvers)
  return printSchema(schema)
}

describe("EffectWeaver", () => {
  it("should satisfy SchemaWeaver", () => {
    expectTypeOf(EffectWeaver).toMatchTypeOf<SchemaWeaver>()
  })

  it("should handle scalar types", () => {
    expect(EffectWeaver.getGraphQLType(Schema.NullOr(Schema.String))).toEqual(
      GraphQLString
    )

    expect(EffectWeaver.getGraphQLType(Schema.NullOr(Schema.Number))).toEqual(
      GraphQLFloat
    )

    expect(
      EffectWeaver.getGraphQLType(
        Schema.NullOr(Schema.Int.annotations({ identifier: "Int" }))
      )
    ).toEqual(GraphQLInt)

    expect(EffectWeaver.getGraphQLType(Schema.NullOr(Schema.Boolean))).toEqual(
      GraphQLBoolean
    )

    expect(
      EffectWeaver.getGraphQLType(
        Schema.NullOr(Schema.Date.annotations({ identifier: "Date" }))
      )
    ).toEqual(GraphQLString)

    expect(
      EffectWeaver.getGraphQLType(
        Schema.NullOr(Schema.String.annotations({ identifier: "UUID" }))
      )
    ).toEqual(GraphQLID)

    expect(
      EffectWeaver.getGraphQLType(
        Schema.NullOr(Schema.String.annotations({ identifier: "ULID" }))
      )
    ).toEqual(GraphQLID)
  })

  it("should handle literal types", () => {
    expect(
      EffectWeaver.getGraphQLType(Schema.NullOr(Schema.Literal("")))
    ).toEqual(GraphQLString)
    expect(
      EffectWeaver.getGraphQLType(Schema.NullOr(Schema.Literal(0)))
    ).toEqual(GraphQLFloat)
    expect(
      EffectWeaver.getGraphQLType(Schema.NullOr(Schema.Literal(false)))
    ).toEqual(GraphQLBoolean)
  })

  it("should handle custom type", () => {
    const DateSchema = Schema.Date.annotations({
      identifier: "Date",
      asField: { type: GraphQLDate },
    })

    expect(EffectWeaver.getGraphQLType(DateSchema)).toEqual(GraphQLDate)

    const Cat = Schema.Struct({
      name: Schema.String,
      age: Schema.Int.annotations({
        identifier: "Int",
        asField: {
          type: GraphQLInt,
          description: "How old is the cat",
        },
      }),
      loveFish: Schema.NullOr(Schema.Boolean),
    }).annotations({
      asObjectType: {
        name: "Cat",
        description: "A cute cat",
      },
    })
    expect(print(Schema.NullOr(Cat))).toMatchInlineSnapshot(`
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
    const Dog1 = Schema.Struct({
      __typename: Schema.optional(Schema.Literal("Dog")),
      name: Schema.optional(Schema.String),
      birthday: Schema.optional(Schema.Date).annotations({
        [asField]: { type: null },
      }),
    })

    expect(print(Dog1)).toMatchInlineSnapshot(`
      "type Dog {
        name: String
      }"
    `)

    const r = resolver.of(standard(Dog1), {
      dog: query(standard(Dog1)).resolve(() => ({})),
    })

    expect(printResolver(r)).toMatchInlineSnapshot(`
      "type Dog {
        name: String
      }

      type Query {
        dog: Dog!
      }"
    `)

    const Dog2 = standard(
      Schema.Struct({
        __typename: Schema.optional(Schema.Literal("Dog")),
        name: Schema.optional(Schema.String),
        birthday: Schema.optional(Schema.Date).annotations({
          [asField]: { type: field.hidden },
        }),
      })
    )

    const r2 = resolver.of(standard(Dog2), {
      dog: query(standard(Dog2)).resolve(() => ({})),
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
    const Dog = Schema.Struct({
      __typename: Schema.optional(Schema.Literal("Dog")),
      name: Schema.optional(Schema.String),
      birthday: Schema.optional(
        Schema.Date.annotations({ identifier: "Date" })
      ),
    })

    let presetCalled = false
    const config = EffectWeaver.config({
      presetGraphQLType: (schema) => {
        presetCalled = true
        const identifier = SchemaAST.getAnnotation<string>(
          SchemaAST.IdentifierAnnotationId
        )(schema.ast).pipe(Option.getOrNull)
        if (identifier === "Date") return GraphQLDate
      },
    })

    const r1 = resolver({ dog: query(standard(Dog)).resolve(() => ({})) })
    const schema1 = EffectWeaver.weave(r1, config)

    const r2 = resolver({ dog: query(standard(Dog)).resolve(() => ({})) })
    const schema2 = weave(EffectWeaver, config, r2)

    expect(printSchema(schema2)).toEqual(printSchema(schema1))
    expect(presetCalled).toBe(true)

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

  it("should handle non-null types", () => {
    expect(EffectWeaver.getGraphQLType(Schema.String)).toEqual(
      new GraphQLNonNull(GraphQLString)
    )
    expect(EffectWeaver.getGraphQLType(Schema.NullOr(Schema.String))).toEqual(
      GraphQLString
    )
    expect(
      EffectWeaver.getGraphQLType(Schema.Union(Schema.String, Schema.Undefined))
    ).toEqual(GraphQLString)
    expect(
      EffectWeaver.getGraphQLType(
        Schema.Union(Schema.String, Schema.Undefined, Schema.Void)
      )
    ).toEqual(GraphQLString)
  })

  it("should handle array types", () => {
    expect(EffectWeaver.getGraphQLType(Schema.Array(Schema.String))).toEqual(
      new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString)))
    )

    expect(
      EffectWeaver.getGraphQLType(Schema.Array(Schema.NullOr(Schema.String)))
    ).toEqual(new GraphQLNonNull(new GraphQLList(GraphQLString)))
  })

  it("should handle array nullability combinations", () => {
    // [String!] - nullable array of non-null strings
    expect(
      EffectWeaver.getGraphQLType(Schema.NullOr(Schema.Array(Schema.String)))
    ).toEqual(new GraphQLList(new GraphQLNonNull(GraphQLString)))
    expect(
      EffectWeaver.getGraphQLType(Schema.NullishOr(Schema.Array(Schema.String)))
    ).toEqual(new GraphQLList(new GraphQLNonNull(GraphQLString)))

    // [String] - nullable array of nullable strings
    expect(
      EffectWeaver.getGraphQLType(
        Schema.NullishOr(Schema.Array(Schema.NullOr(Schema.String)))
      )
    ).toEqual(new GraphQLList(GraphQLString))
    expect(
      EffectWeaver.getGraphQLType(
        Schema.NullOr(Schema.Array(Schema.NullishOr(Schema.String)))
      )
    ).toEqual(new GraphQLList(GraphQLString))
  })

  it("should handle tuple with rest elements", () => {
    const tupleAst = new SchemaAST.TupleType(
      [],
      [new SchemaAST.Type(SchemaAST.stringKeyword)],
      false,
      {}
    )
    const TupleSchema = Schema.make(tupleAst)
    const gqlType = EffectWeaver.getGraphQLType(TupleSchema) as GraphQLNonNull<
      GraphQLList<any>
    >

    expect(gqlType).toBeInstanceOf(GraphQLNonNull)
    const list = gqlType.ofType
    expect(list).toBeInstanceOf(GraphQLList)
    expect((list as GraphQLList<any>).ofType).toBeInstanceOf(GraphQLNonNull)
  })

  it("should resolve suspend field on struct", () => {
    const Lazy = Schema.Struct({
      value: Schema.suspend(() => Schema.String),
    })

    const gql = EffectWeaver.getGraphQLType(Lazy) as GraphQLNonNull<any>
    const fields = (gql.ofType as GraphQLObjectType).getFields()
    expect(fields.value.type).toBeInstanceOf(GraphQLNonNull)
    expect((fields.value.type as GraphQLNonNull<any>).ofType).toBe(
      GraphQLString
    )
  })

  it("should resolve union containing suspend field", () => {
    const Friend = Schema.Struct({ name: Schema.String })
    const Wrapper = Schema.Struct({
      friend: Schema.Union(
        Schema.suspend(() => Friend),
        Schema.Null
      ),
    })

    const gql = EffectWeaver.getGraphQLType(
      Wrapper
    ) as GraphQLNonNull<GraphQLObjectType>
    const fields = gql.ofType.getFields()
    expect(fields.friend.type).toBeInstanceOf(GraphQLNonNull)
    expect((fields.friend.type as GraphQLNonNull<any>).ofType).toBeInstanceOf(
      GraphQLObjectType
    )
  })

  it("should handle object types", () => {
    const User = Schema.Struct({
      name: Schema.String,
      age: Schema.Number,
    })

    const type = EffectWeaver.getGraphQLType(User)
    expect(type).toBeInstanceOf(GraphQLNonNull)
    expect((type as GraphQLNonNull<any>).ofType).toBeInstanceOf(
      GraphQLObjectType
    )
  })

  it("should handle enum types", () => {
    const Role = Schema.Enums({
      Admin: "ADMIN",
      User: "USER",
      Guest: "GUEST",
    })

    const type = EffectWeaver.getGraphQLType(Role)
    expect(type).toBeInstanceOf(GraphQLNonNull)
  })

  it("should convert schema to interface via ensureInterfaceType", () => {
    const Node = Schema.Struct({
      id: Schema.String,
    })
    const iface = EffectWeaver.ensureInterfaceType(Node)
    expect(iface).toBeInstanceOf(GraphQLInterfaceType)
  })

  it("should handle enum with valuesConfig", () => {
    const Status = Schema.Enums({
      Active: "ACTIVE",
      Inactive: "INACTIVE",
      Pending: "PENDING",
    }).annotations({
      asEnumType: {
        name: "Status",
        description: "User status",
        valuesConfig: {
          Active: { description: "User is active" },
          Inactive: {
            description: "User is inactive",
            deprecationReason: "Use Active or Pending",
          },
          Pending: { description: "User is pending approval" },
        },
      },
    })

    expect(print(Status)).toMatchInlineSnapshot(`
      """"User status"""
      enum Status {
        """User is active"""
        ACTIVE

        """User is inactive"""
        INACTIVE @deprecated(reason: "Use Active or Pending")

        """User is pending approval"""
        PENDING
      }"
    `)
  })

  it("should resolve enum values correctly", async () => {
    const Role = Schema.Enums({
      Admin: "ADMIN",
      User: "USER",
      Guest: "GUEST",
    }).annotations({ asEnumType: { name: "Role" } })

    const r = resolver({
      role: query(standard(Role)).resolve(() => "ADMIN"),
    })

    const schema = weave(EffectWeaver, r)
    const result = await execute({
      schema,
      document: parse("query { role }"),
    })

    expect(result.data?.role).toBe("ADMIN")
  })

  it("should handle union types", () => {
    const Cat = Schema.Struct({
      __typename: Schema.Literal("Cat"),
      meow: Schema.String,
    })

    const Dog = Schema.Struct({
      __typename: Schema.Literal("Dog"),
      bark: Schema.String,
    })

    const Animal = Schema.Union(Cat, Dog)

    const type = EffectWeaver.getGraphQLType(Animal)
    expect(type).toBeInstanceOf(GraphQLNonNull)
  })

  it("should handle union with resolveType", () => {
    const Cat = Schema.Struct({
      name: Schema.String,
      meow: Schema.String,
    }).annotations({ asObjectType: { name: "Cat" } })

    const Dog = Schema.Struct({
      name: Schema.String,
      bark: Schema.String,
    }).annotations({ asObjectType: { name: "Dog" } })

    // const Animal = asUnionType(Schema.Union(Cat, Dog), {
    //   name: "Animal",
    //   resolveType: (value) => {
    //     if ("meow" in value) return "Cat"
    //     if ("bark" in value) return "Dog"
    //     return null
    //   },
    // })
    const Animal = Schema.Union(Cat, Dog).annotations({
      asUnionType: {
        name: "Animal",
        resolveType: (
          value: Schema.Schema.Type<typeof Cat> | Schema.Schema.Type<typeof Dog>
        ) => {
          if ("meow" in value) return "Cat"
          if ("bark" in value) return "Dog"
          return undefined
        },
      },
    })

    const r = resolver({
      animal: query(standard(Animal)).resolve(() => ({
        name: "Fluffy",
        meow: "meow",
      })),
    })

    expect(printResolver(r)).toMatchInlineSnapshot(`
      "type Query {
        animal: Animal!
      }

      union Animal = Cat | Dog

      type Cat {
        name: String!
        meow: String!
      }

      type Dog {
        name: String!
        bark: String!
      }"
    `)
  })

  it("should handle nullable union types", () => {
    const Cat = Schema.Struct({
      __typename: Schema.Literal("Cat"),
      meow: Schema.String,
    })

    const Dog = Schema.Struct({
      __typename: Schema.Literal("Dog"),
      bark: Schema.String,
    })

    const Animal = Schema.NullOr(Schema.Union(Cat, Dog))

    const type = EffectWeaver.getGraphQLType(Animal)
    expect(type).not.toBeInstanceOf(GraphQLNonNull)
  })

  it("should handle nested structures", () => {
    const Address = Schema.Struct({
      street: Schema.String,
      city: Schema.String,
    })

    const User = Schema.Struct({
      name: Schema.String,
      address: Address,
    })

    const type = EffectWeaver.getGraphQLType(
      User
    ) as GraphQLNonNull<GraphQLObjectType>
    expect(type.ofType).toBeInstanceOf(GraphQLObjectType)

    const fields = type.ofType.getFields()
    expect(fields.address.type).toBeInstanceOf(GraphQLNonNull)
    expect((fields.address.type as GraphQLNonNull<any>).ofType).toBeInstanceOf(
      GraphQLObjectType
    )
  })

  it("should handle with object metadata", () => {
    const User = Schema.Struct({
      id: Schema.String,
      name: Schema.String,
    }).annotations({
      asObjectType: {
        name: "CustomUser",
        description: "A custom user type",
      },
    })

    const type = EffectWeaver.getGraphQLType(
      User
    ) as GraphQLNonNull<GraphQLObjectType>
    expect(type.ofType.name).toBe("CustomUser")
    expect(type.ofType.description).toBe("A custom user type")

    const User2 = Schema.Struct({
      id: Schema.String,
      name: Schema.String,
    }).annotations({
      title: "CustomUser",
      description: "A custom user type",
    })

    const type2 = EffectWeaver.getGraphQLType(
      User2
    ) as GraphQLNonNull<GraphQLObjectType>
    expect(type2.ofType.name).toBe("CustomUser")
    expect(type2.ofType.description).toBe("A custom user type")
  })

  it("should handle with field metadata", () => {
    const User = Schema.Struct({
      id: Schema.String,
      name: Schema.String.annotations({
        asField: {
          description: "The user's name",
        },
      }),
      email: Schema.String.annotations({
        asField: {
          description: "The user's email address",
          deprecationReason: "Use contactEmail instead",
        },
      }),
    })

    const type = EffectWeaver.getGraphQLType(
      User
    ) as GraphQLNonNull<GraphQLObjectType>
    const fields = type.ofType.getFields()
    expect(fields.name.description).toBe("The user's name")
    expect(fields.email.description).toBe("The user's email address")
    expect(fields.email.deprecationReason).toBe("Use contactEmail instead")

    const User2 = Schema.Struct({
      id: Schema.String,
      name: Schema.String.annotations({
        description: "The user's name",
      }),
      email: Schema.String.annotations({
        description: "The user's email address",
        deprecationReason: "Use contactEmail instead",
      }),
    })

    const type2 = EffectWeaver.getGraphQLType(
      User2
    ) as GraphQLNonNull<GraphQLObjectType>
    const fields2 = type2.ofType.getFields()
    expect(fields2.name.description).toBe("The user's name")
    expect(fields2.email.description).toBe("The user's email address")
    expect(fields2.email.deprecationReason).toBe("Use contactEmail instead")
  })

  it("should handle with enum metadata", () => {
    const Role = Schema.Enums({
      Admin: "ADMIN",
      User: "USER",
    }).annotations({
      asEnumType: {
        name: "UserRole",
        description: "User role in the system",
      },
    })

    const type = EffectWeaver.getGraphQLType(Role) as GraphQLNonNull<any>
    expect(type.ofType.name).toBe("UserRole")
    expect(type.ofType.description).toBe("User role in the system")

    const Role2 = Schema.Enums({
      Admin: "ADMIN",
      User: "USER",
    }).annotations({
      title: "UserRole",
      description: "User role in the system",
    })

    const type2 = EffectWeaver.getGraphQLType(Role2) as GraphQLNonNull<any>
    expect(type2.ofType.name).toBe("UserRole")
    expect(type2.ofType.description).toBe("User role in the system")
  })

  it("should handle with union metadata", () => {
    const Cat = Schema.Struct({
      __typename: Schema.Literal("Cat"),
      meow: Schema.String,
    })

    const Dog = Schema.Struct({
      __typename: Schema.Literal("Dog"),
      bark: Schema.String,
    })

    const Animal = Schema.Union(Cat, Dog).annotations({
      asUnionType: {
        name: "Animal",
        description: "An animal union type",
      },
    })

    const type = EffectWeaver.getGraphQLType(Animal) as GraphQLNonNull<any>
    expect(type.ofType.name).toBe("Animal")
    expect(type.ofType.description).toBe("An animal union type")

    const Animal2 = Schema.Union(Cat, Dog).annotations({
      title: "Animal",
      description: "An animal union type",
    })

    const type2 = EffectWeaver.getGraphQLType(Animal2) as GraphQLNonNull<any>
    expect(type2.ofType.name).toBe("Animal")
    expect(type2.ofType.description).toBe("An animal union type")
  })

  it("should handle interface implementation", () => {
    const Node = Schema.Struct({
      id: Schema.String,
    }).annotations({
      asObjectType: { name: "Node", description: "Node interface" },
    })

    const User = Schema.Struct({
      id: Schema.String,
      name: Schema.String,
    }).annotations({
      asObjectType: {
        name: "User",
        interfaces: [Node],
      },
    })

    const r = resolver.of(standard(User), {
      user: query(standard(User)).resolve(() => ({ id: "1", name: "Alice" })),
    })

    expect(printResolver(r)).toMatchInlineSnapshot(`
      "type User implements Node {
        id: String!
        name: String!
      }

      """Node interface"""
      interface Node {
        id: String!
      }

      type Query {
        user: User!
      }"
    `)
  })

  describe("should avoid duplicate", () => {
    it("should merge field from multiple resolver", () => {
      const Dog = Schema.Struct({
        __typename: Schema.optional(Schema.Literal("Dog")),
        name: Schema.String,
        birthday: Schema.String,
      })

      const r1 = resolver.of(standard(Dog), {
        dog: query(standard(Dog)).resolve(() => ({
          name: "",
          birthday: "2012-12-12",
        })),
        age: field(standard(Schema.Number)).resolve((dog) => {
          return new Date().getFullYear() - new Date(dog.birthday).getFullYear()
        }),
      })

      const r2 = resolver.of(standard(Dog), {
        isCute: field(standard(Schema.Boolean)).resolve(() => true),
      })

      expect(printResolver(r1, r2)).toMatchInlineSnapshot(`
        "type Dog {
          name: String!
          birthday: String!
          age: Float!
          isCute: Boolean!
        }

        type Query {
          dog: Dog!
        }"
      `)
    })

    it("should avoid duplicate object", () => {
      const Dog = Schema.Struct({
        __typename: Schema.optional(Schema.Literal("Dog")),
        name: Schema.String,
        birthday: Schema.String,
      })

      const Cat = Schema.Struct({
        __typename: Schema.optional(Schema.Literal("Cat")),
        name: Schema.String,
        birthday: Schema.String,
        friend: Schema.NullOr(Dog),
      })

      const r1 = resolver.of(standard(Dog), {
        dog: query(standard(Dog)).resolve(() => ({
          name: "",
          birthday: "2012-12-12",
        })),
      })

      const r2 = resolver.of(standard(Cat), {
        cat: query(standard(Cat)).resolve(() => ({
          name: "",
          birthday: "2012-12-12",
          friend: { name: "", birthday: "2012-12-12" },
        })),
      })

      expect(printResolver(r1, r2)).toMatchInlineSnapshot(`
        "type Dog {
          name: String!
          birthday: String!
        }

        type Cat {
          name: String!
          birthday: String!
          friend: Dog
        }

        type Query {
          dog: Dog!
          cat: Cat!
        }"
      `)
    })

    it("should avoid duplicate object in nested structures", () => {
      const Prize = Schema.Struct({
        __typename: Schema.optional(Schema.Literal("Prize")),
        name: Schema.String,
        value: Schema.Number,
      })

      const Orange = Schema.Struct({
        __typename: Schema.optional(Schema.Literal("Orange")),
        name: Schema.String,
        color: Schema.String,
        prize: Prize,
      }).annotations({ asObjectType: { name: "Orange" } })

      const Apple = Schema.Struct({
        __typename: Schema.optional(Schema.Literal("Apple")),
        name: Schema.String,
        sweetness: Schema.Number,
        prize: Prize,
      }).annotations({ asObjectType: { name: "Apple" } })

      const r1 = resolver({
        orange: query(standard(Orange)).resolve(() => ({
          name: "Orange",
          color: "orange",
          prize: { name: "Gold", value: 100 },
        })),
        apple: query(standard(Apple)).resolve(() => ({
          name: "Apple",
          sweetness: 10,
          prize: { name: "Silver", value: 50 },
        })),
      })

      expect(printResolver(r1)).toMatchInlineSnapshot(`
        "type Query {
          orange: Orange!
          apple: Apple!
        }

        type Orange {
          name: String!
          color: String!
          prize: Prize!
        }

        type Prize {
          name: String!
          value: Float!
        }

        type Apple {
          name: String!
          sweetness: Float!
          prize: Prize!
        }"
      `)
    })

    it("should avoid duplicate object in interface", () => {
      const Prize = Schema.Struct({
        __typename: Schema.optional(Schema.Literal("Prize")),
        name: Schema.String,
        value: Schema.Number,
      })

      const Fruit = Schema.Struct({
        __typename: Schema.optional(Schema.Literal("Fruit")),
        name: Schema.String,
        color: Schema.String,
        prize: Prize,
      }).annotations({ asObjectType: { name: "Fruit" } })

      const Orange = Schema.Struct({
        __typename: Schema.optional(Schema.Literal("Orange")),
        name: Schema.String,
        color: Schema.String,
        prize: Prize,
        flavor: Schema.String,
      }).annotations({
        asObjectType: {
          name: "Orange",
          interfaces: [Fruit],
        },
      })

      const Apple = Schema.Struct({
        __typename: Schema.optional(Schema.Literal("Apple")),
        name: Schema.String,
        color: Schema.String,
        prize: Prize,
        sweetness: Schema.Number,
      }).annotations({
        asObjectType: {
          name: "Apple",
          interfaces: [Fruit],
        },
      })

      const r1 = resolver({
        orange: query(standard(Orange)).resolve(() => ({
          name: "Orange",
          color: "orange",
          prize: { name: "Gold", value: 100 },
          flavor: "citrus",
        })),
        apple: query(standard(Apple)).resolve(() => ({
          name: "Apple",
          color: "red",
          prize: { name: "Silver", value: 50 },
          sweetness: 10,
        })),
      })

      expect(printResolver(r1)).toMatchInlineSnapshot(`
        "type Query {
          orange: Orange!
          apple: Apple!
        }

        type Orange implements Fruit {
          name: String!
          color: String!
          prize: Prize!
          flavor: String!
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

        type Apple implements Fruit {
          name: String!
          color: String!
          prize: Prize!
          sweetness: Float!
        }"
      `)
    })

    it("should avoid duplicate input", () => {
      const Dog = Schema.Struct({
        __typename: Schema.optional(Schema.Literal("Dog")),
        name: Schema.String,
        birthday: Schema.String,
      })

      const DogInput = Schema.Struct({
        __typename: Schema.optional(Schema.Literal("DogInput")),
        name: Schema.String,
        birthday: Schema.String,
      })

      const DataInput = Schema.Struct({
        __typename: Schema.optional(Schema.Literal("DataInput")),
        dog: DogInput,
      })

      const r1 = resolver.of(standard(Dog), {
        createDog: mutation(standard(Dog))
          .input({ data: standard(DogInput) })
          .resolve(({ data }) => ({ ...data, __typename: "Dog" })),
        dogs: query(standard(Schema.Array(Dog))).resolve(() => []),
      })

      const r2 = resolver({
        createData: mutation(standard(Dog))
          .input({ data: standard(DataInput) })
          .resolve(({ data }) => ({ ...data.dog, __typename: "Dog" })),
      })

      expect(printResolver(r1, r2)).toMatchInlineSnapshot(`
        "type Dog {
          name: String!
          birthday: String!
        }

        type Query {
          dogs: [Dog!]!
        }

        type Mutation {
          createDog(data: DogInput!): Dog!
          createData(data: DataInput!): Dog!
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
      const Fruit = Schema.Enums({
        Apple: "apple",
        Banana: "banana",
        Orange: "orange",
      }).annotations({ asEnumType: { name: "Fruit" } })

      const r1 = resolver({
        fruit: query(standard(Schema.NullOr(Fruit))).resolve(
          () => "apple" as const
        ),
        fruits: query(standard(Schema.Array(Schema.NullishOr(Fruit)))).resolve(
          () => []
        ),
        mustFruit: query(standard(Fruit)).resolve(() => "apple" as const),
        mustFruits: query(standard(Schema.Array(Fruit))).resolve(() => []),
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
      const Fruit = Schema.Struct({
        __typename: Schema.optional(Schema.Literal("Fruit")),
        color: Schema.optional(Schema.String),
      }).annotations({ asObjectType: { name: "Fruit" } })
      const Orange = Schema.Struct({
        __typename: Schema.optional(Schema.Literal("Orange")),
        color: Schema.optional(Schema.String),
        flavor: Schema.String,
      }).annotations({
        asObjectType: {
          name: "Orange",
          interfaces: [Fruit],
        },
      })

      const Apple = Schema.Struct({
        __typename: Schema.optional(Schema.Literal("Apple")),
        color: Schema.optional(Schema.String),
        sweetness: Schema.Number,
      }).annotations({
        asObjectType: {
          name: "Apple",
          interfaces: [Fruit],
        },
      })

      const r1 = resolver({
        orange: query(standard(Schema.NullishOr(Orange))).resolve(() => ({
          color: "orange",
          flavor: "citrus",
        })),
        oranges: query(
          standard(Schema.Array(Schema.NullishOr(Orange)))
        ).resolve(() => []),
        apple: query(standard(Schema.NullOr(Apple))).resolve(() => ({
          color: "red",
          sweetness: 10,
        })),
        apples: query(standard(Schema.Array(Schema.NullOr(Apple)))).resolve(
          () => []
        ),
      })

      expect(printResolver(r1)).toMatchInlineSnapshot(`
        "type Query {
          orange: Orange
          oranges: [Orange]!
          apple: Apple
          apples: [Apple]!
        }

        type Orange implements Fruit {
          color: String
          flavor: String!
        }

        interface Fruit {
          color: String
        }

        type Apple implements Fruit {
          color: String
          sweetness: Float!
        }"
      `)
    })

    it("should avoid duplicate union", () => {
      const Apple = Schema.Struct({
        __typename: Schema.optional(Schema.Literal("Apple")),
        flavor: Schema.String,
      })
      const Orange = Schema.Struct({
        __typename: Schema.optional(Schema.Literal("Orange")),
        color: Schema.String,
      })
      const Fruit = Schema.Union(Apple, Orange).annotations({
        asUnionType: { name: "Fruit" },
      })

      const r1 = resolver({
        fruit: query(standard(Schema.NullOr(Fruit))).resolve(() => ({
          flavor: "",
        })),
        fruits: query(standard(Schema.Array(Schema.NullOr(Fruit)))).resolve(
          () => []
        ),
        mustFruit: query(standard(Fruit)).resolve(() => ({ flavor: "" })),
        mustFruits: query(standard(Schema.Array(Schema.NullOr(Fruit)))).resolve(
          () => []
        ),
      })

      expect(printResolver(r1)).toMatchInlineSnapshot(`
        "type Query {
          fruit: Fruit
          fruits: [Fruit]!
          mustFruit: Fruit!
          mustFruits: [Fruit]!
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

  describe("Edge cases and advanced features", () => {
    it("should handle circular references", () => {
      interface IUser {
        readonly name: string
        readonly friend?: IUser | null | undefined
      }

      const User: Schema.Schema<IUser> = Schema.Struct({
        name: Schema.String,
        friend: Schema.optional(
          Schema.NullOr(Schema.suspend((): Schema.Schema<IUser> => User))
        ),
      })

      const r = resolver({
        user: query(standard(User)).resolve(() => ({
          name: "Alice",
          friend: { name: "Bob" },
        })),
      })

      expect(printResolver(r)).toMatchInlineSnapshot(`
        "type Query {
          user: User!
        }

        type User {
          name: String!
          friend: User
        }"
      `)
    })

    it("should throw error for unsupported union with non-object types", () => {
      // This tests that the weaver properly validates union types
      const StringOrNumber = Schema.Union(Schema.String, Schema.Number)

      expect(() => EffectWeaver.getGraphQLType(StringOrNumber)).toThrow(
        /Union types .* can only contain objects/i
      )
    })

    it("should handle optional fields with complex types", () => {
      const Address = Schema.Struct({
        street: Schema.String,
        city: Schema.String,
        zipCode: Schema.optional(Schema.String),
      }).annotations({ asObjectType: { name: "Address" } })

      const addressType = EffectWeaver.getGraphQLType(Address)

      const User = Schema.Struct({
        name: Schema.String,
        address: Schema.optional(Address).annotations({
          asField: { type: addressType },
        }),
        addresses: Schema.optional(Schema.Array(Address)).annotations({
          asField: { type: new GraphQLList(addressType) },
        }),
      }).annotations({ asObjectType: { name: "User" } })

      const r = resolver({
        user: query(standard(User)).resolve(() => ({
          name: "Alice",
          address: { street: "123 Main St", city: "Springfield" },
        })),
      })

      expect(printResolver(r)).toMatchInlineSnapshot(`
        "type Query {
          user: User!
        }

        type User {
          name: String!
          address: Address!
          addresses: [Address!]
        }

        type Address {
          street: String!
          city: String!
          zipCode: String
        }"
      `)
    })

    it("should handle branded types", () => {
      const Email = Schema.String.pipe(
        Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
      ).annotations({ identifier: "Email" })

      const User = Schema.Struct({
        name: Schema.String,
        email: Email,
      })

      const type = EffectWeaver.getGraphQLType(
        User
      ) as GraphQLNonNull<GraphQLObjectType>
      const fields = type.ofType.getFields()

      // Branded types should still resolve to their base GraphQL type
      expect(fields.email.type).toBeInstanceOf(GraphQLNonNull)
      expect((fields.email.type as GraphQLNonNull<any>).ofType).toBe(
        GraphQLString
      )
    })

    it("should handle transformation schemas", () => {
      const PositiveInt = Schema.Number.pipe(Schema.int(), Schema.positive())

      const Product = Schema.Struct({
        name: Schema.String,
        quantity: PositiveInt,
      })

      const r = resolver({
        product: query(standard(Product)).resolve(() => ({
          name: "Widget",
          quantity: 5,
        })),
      })

      expect(printResolver(r)).toMatchInlineSnapshot(`
        "type Query {
          product: Product!
        }

        type Product {
          name: String!
          quantity: Float!
        }"
      `)
    })

    it("should handle deeply nested structures", () => {
      const Level3 = Schema.Struct({
        value: Schema.String,
      }).annotations({ asObjectType: { name: "Level3" } })

      const Level2 = Schema.Struct({
        level3: Level3,
      }).annotations({ asObjectType: { name: "Level2" } })

      const Level1 = Schema.Struct({
        level2: Level2,
      }).annotations({ asObjectType: { name: "Level1" } })

      const r = resolver({
        root: query(standard(Level1)).resolve(() => ({
          level2: {
            level3: {
              value: "deep",
            },
          },
        })),
      })

      expect(printResolver(r)).toMatchInlineSnapshot(`
        "type Query {
          root: Level1!
        }

        type Level1 {
          level2: Level2!
        }

        type Level2 {
          level3: Level3!
        }

        type Level3 {
          value: String!
        }"
      `)
    })

    it("should handle empty objects", () => {
      const Empty = Schema.Struct({})

      const type = EffectWeaver.getGraphQLType(
        Empty
      ) as GraphQLNonNull<GraphQLObjectType>
      expect(type.ofType).toBeInstanceOf(GraphQLObjectType)
      expect(Object.keys(type.ofType.getFields())).toHaveLength(0)
    })

    it("should handle multiple interfaces", () => {
      const Node = Schema.Struct({
        id: Schema.String,
      }).annotations({ asObjectType: { name: "Node" } })

      const Timestamped = Schema.Struct({
        createdAt: Schema.Date.annotations({ identifier: "Date" }),
      }).annotations({ asObjectType: { name: "Timestamped" } })

      const User = Schema.Struct({
        id: Schema.String,
        createdAt: Schema.Date.annotations({ identifier: "Date" }),
        name: Schema.String,
      }).annotations({
        asObjectType: {
          name: "User",
          interfaces: [Node, Timestamped],
        },
      })

      const r = resolver({
        user: query(standard(User)).resolve(() => ({
          id: "1",
          createdAt: new Date(),
          name: "Alice",
        })),
      })

      expect(printResolver(r)).toMatchInlineSnapshot(`
        "type Query {
          user: User!
        }

        type User implements Node & Timestamped {
          id: String!
          createdAt: String!
          name: String!
        }

        interface Node {
          id: String!
        }

        interface Timestamped {
          createdAt: String!
        }"
      `)
    })
  })

  it("should throw error for unsupported ast type", () => {
    const bigIntSchema = Schema.make(new SchemaAST.BigIntKeyword())
    expect(() => EffectWeaver.getGraphQLType(bigIntSchema)).toThrow(
      /BigIntKeyword/
    )
  })

  it("should respect getGraphQLTypeBySelf helper", () => {
    const type = (EffectWeaver as any).getGraphQLTypeBySelf.call(Schema.String)
    expect(type).toBeInstanceOf(GraphQLNonNull)
    expect((type as GraphQLNonNull<any>).ofType).toBe(GraphQLString)
  })
})
