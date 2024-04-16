import {
  GraphQLFloat,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from "graphql"
import { describe, expectTypeOf, it } from "vitest"
import { silk } from "../src/resolver/silk"
import { loom } from "../src/resolver/resolver"

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
        resolve: (input) => {
          it("should infer output type", () => {
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
        simpleResolver.giraffe.resolve
      ).returns.resolves.toEqualTypeOf<IGiraffe>()
    })
    it("should infer input type", () => {
      expectTypeOf(simpleResolver.giraffe.resolve)
        .parameter(0)
        .toEqualTypeOf<{ name: string }>()

      expectTypeOf(simpleResolver.createGiraffe.resolve)
        .parameter(0)
        .toEqualTypeOf<Partial<IGiraffe>>()
    })
  })

  describe("field", () => {
    const simpleResolver = resolver.of(Giraffe, {
      age: field(silk(GraphQLInt), async (giraffe) => {
        it("should infer parent type", () => {
          expectTypeOf(giraffe).toEqualTypeOf<IGiraffe>()
        })
        return new Date().getFullYear() - giraffe.birthday.getFullYear()
      }),
      greeting: field(silk(new GraphQLNonNull(GraphQLString)), {
        input: { myName: silk(GraphQLString) },
        resolve: (giraffe, input) => {
          it("should infer parent type", () => {
            expectTypeOf(giraffe).toEqualTypeOf<IGiraffe>()
          })
          it("should infer input type", () => {
            expectTypeOf(input).toEqualTypeOf<{ myName: string | undefined }>()
          })
          return `Hello, ${input.myName ?? "my friend"}! My name is ${giraffe.name}.`
        },
      }),
    })
    it("should infer input type", () => {
      expectTypeOf(simpleResolver.age.resolve)
        .parameter(0)
        .toEqualTypeOf<IGiraffe>()
    })

    it("should infer output type", () => {
      expectTypeOf(simpleResolver.age.resolve).returns.resolves.toEqualTypeOf<
        number | undefined
      >()
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
        simpleResolver.newGiraffe.resolve
      ).returns.resolves.toEqualTypeOf<IGiraffe>()
    })
  })
})
