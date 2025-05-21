import type { StandardSchemaV1 } from "@standard-schema/spec"
import {
  GraphQLFloat,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from "graphql"
import { describe, expectTypeOf, it } from "vitest"
import { type InferInputI, getStandardValue } from "../src/resolver"
import { loom } from "../src/resolver/resolver"
import { silk } from "../src/resolver/silk"
import type { RequireKeys } from "../src/utils"

const { resolver, query, mutation, field, subscription } = loom

describe("resolver type", () => {
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

  describe("query and mutation", () => {
    const simpleResolver = resolver({
      giraffe: query(Giraffe, {
        input: {
          name: silk<string, string>(new GraphQLNonNull(GraphQLString)),
        },
        resolve: (input) => {
          it("should infer output type", () => {
            expectTypeOf(input).toEqualTypeOf<{ name: string }>()
          })
          return {
            name: input.name ?? "",
            birthday: new Date(),
            heightInMeters: 5,
          }
        },
      }),
      createGiraffe: mutation(Giraffe, {
        input: GiraffeInput,
        middlewares: [
          async ({ parent, next, parseInput }) => {
            it("should infer input type", () => {
              expectTypeOf(parseInput).returns.resolves.toEqualTypeOf<
                StandardSchemaV1.Result<Partial<IGiraffe>>
              >()
            })
            it("should infer parent type", () => {
              expectTypeOf(parent).toEqualTypeOf<undefined>()
            })
            it("should infer output type", () => {
              expectTypeOf(next).returns.resolves.toEqualTypeOf<IGiraffe>()
            })
            return next()
          },
        ],
        resolve: (input) => {
          it("should infer input type", () => {
            expectTypeOf(input).toEqualTypeOf<Partial<IGiraffe>>()
          })
          return {
            name: input.name ?? "Giraffe",
            birthday: input.birthday ?? new Date(),
            heightInMeters: input.heightInMeters ?? 5,
          }
        },
      }),
    })
    it("should infer output type", () => {
      expectTypeOf(
        simpleResolver["~meta"].fields.giraffe["~meta"].resolve
      ).returns.resolves.toEqualTypeOf<IGiraffe>()
    })
    it("should infer input type", () => {
      expectTypeOf(simpleResolver["~meta"].fields.giraffe["~meta"].resolve)
        .parameter(0)
        .toEqualTypeOf<{ name: string }>()

      type c1 = InferInputI<typeof GiraffeInput>

      expectTypeOf<c1>().toEqualTypeOf<Partial<IGiraffe>>()

      type c2 = StandardSchemaV1.InferInput<typeof GiraffeInput>

      expectTypeOf<c2>().toEqualTypeOf<Partial<IGiraffe>>()
      expectTypeOf(
        simpleResolver["~meta"].fields.createGiraffe["~meta"].resolve
      )
        .parameter(0)
        .toEqualTypeOf<Partial<IGiraffe>>()
    })
  })

  describe("field", () => {
    const simpleResolver = resolver.of(
      Giraffe,
      {
        hello: query(silk<string>(GraphQLString), async () => {
          return "hello"
        }),
        age: field(silk<number>(GraphQLInt), async (giraffe) => {
          it("should infer parent type", () => {
            expectTypeOf(giraffe).toEqualTypeOf<IGiraffe>()
          })
          return new Date().getFullYear() - giraffe.birthday.getFullYear()
        }),
        greeting: field(silk<string>(new GraphQLNonNull(GraphQLString)), {
          input: { myName: silk(GraphQLString) },
          // dependencies: undefined as undefined,
          middlewares: [
            async ({ parent, next, parseInput }) => {
              it("should infer parent type", () => {
                expectTypeOf(parent).toEqualTypeOf<IGiraffe>()
              })
              it("should infer output type", () => {
                expectTypeOf(next).returns.resolves.toEqualTypeOf<string>()
              })
              const input = await parseInput()
              it("should infer input type", () => {
                expectTypeOf(input).toEqualTypeOf<
                  StandardSchemaV1.Result<{
                    myName: string | undefined | null
                  }>
                >()
              })
              return next()
            },
          ],
          resolve: (giraffe, input) => {
            it("should infer parent type", () => {
              expectTypeOf(giraffe).toEqualTypeOf<IGiraffe>()
            })
            it("should infer input type", () => {
              expectTypeOf(input).toEqualTypeOf<{
                myName: string | undefined | null
              }>()
            })
            return `Hello, ${input.myName ?? "my friend"}! My name is ${giraffe.name}.`
          },
        }),
      },
      {
        middlewares: [
          async ({ parent, next, parseInput }) => {
            it("should infer parent type", () => {
              expectTypeOf(parent).toEqualTypeOf<IGiraffe | undefined>()
            })

            const input = getStandardValue(await parseInput())
            it("should infer input type", () => {
              expectTypeOf(input).toEqualTypeOf<{
                myName: string | null | undefined
              } | void>()
            })

            it("should infer output type", () => {
              expectTypeOf(next).returns.resolves.toEqualTypeOf<
                string | number
              >()
            })
            return next()
          },
        ],
      }
    )
    it("should infer input type", () => {
      expectTypeOf(simpleResolver["~meta"].fields.age["~meta"].resolve)
        .parameter(0)
        .toEqualTypeOf<IGiraffe>()
    })

    it("should infer output type", () => {
      expectTypeOf(
        simpleResolver["~meta"].fields.age["~meta"].resolve
      ).returns.resolves.toEqualTypeOf<number>()
    })
  })

  describe("field with dependencies", () => {
    type ISelectiveGiraffe = {
      name?: string
      birthday?: Date
    }
    const SelectiveGiraffe = silk<ISelectiveGiraffe>(
      new GraphQLObjectType<ISelectiveGiraffe>({
        name: "SelectiveGiraffe",
        fields: {
          name: { type: GraphQLString },
          birthday: { type: GraphQLString },
        },
      })
    )
    const selectiveResolver = resolver.of(SelectiveGiraffe, {
      age: field(silk<number>(GraphQLInt), {
        dependencies: ["birthday"] as ["birthday"],
        resolve: async (giraffe) => {
          it("should infer parent type", () => {
            expectTypeOf(giraffe).toEqualTypeOf<
              RequireKeys<ISelectiveGiraffe, "birthday">
            >()
            expectTypeOf<
              RequireKeys<ISelectiveGiraffe, "birthday">
            >().toEqualTypeOf<
              { birthday: Date } & { name?: string | undefined }
            >()
          })
          return new Date().getFullYear() - giraffe.birthday.getFullYear()
        },
        middlewares: [
          async ({ parent, next }) => {
            it("should infer parent type", () => {
              expectTypeOf(parent).toEqualTypeOf<
                RequireKeys<ISelectiveGiraffe, "birthday">
              >()
            })
            return next()
          },
        ],
      }),

      age1: field(silk<number>(GraphQLInt))
        .derivedFrom("birthday")
        .resolve(async (giraffe) => {
          it("should infer parent type", () => {
            expectTypeOf(giraffe).toEqualTypeOf<
              RequireKeys<ISelectiveGiraffe, "birthday">
            >()
          })
          return new Date().getFullYear() - giraffe.birthday.getFullYear()
        }),
    })

    it("should infer input type", () => {
      expectTypeOf(selectiveResolver["~meta"].fields.age["~meta"].resolve)
        .parameter(0)
        .toEqualTypeOf<ISelectiveGiraffe>()
    })

    it("should infer output type", () => {
      expectTypeOf(
        selectiveResolver["~meta"].fields.age["~meta"].resolve
      ).returns.resolves.toEqualTypeOf<number>()
    })
  })

  describe("subscription", () => {
    const simpleResolver = resolver.of(Giraffe, {
      newGiraffe: subscription(Giraffe, {
        input: GiraffeInput,
        subscribe: async function* (data) {
          it("should infer input type", () => {
            expectTypeOf(data).toEqualTypeOf<Partial<IGiraffe>>()
          })
          yield data.name ?? ""
        },
        resolve: (name) => {
          it("should infer subscribing data type", () => {
            expectTypeOf(name).toEqualTypeOf<string>()
          })
          return {
            name,
            birthday: new Date(),
            heightInMeters: 5,
          }
        },
      }),
    })
    it("should infer output type", () => {
      expectTypeOf(
        simpleResolver["~meta"].fields.newGiraffe["~meta"].resolve
      ).returns.resolves.toEqualTypeOf<IGiraffe>()
    })
  })
})
