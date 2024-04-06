import {
  GraphQLFloat,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from "graphql"
import { describe, expectTypeOf, it } from "vitest"
import { silk } from "./silk"
import {
  silkField as field,
  silkMutation as mutation,
  silkQuery as query,
  silkResolver as resolver,
  silkSubscription as subscription,
} from "./resolver"

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

describe("resolver type", () => {
  describe("query and mutation", () => {
    it("should infer output and input type", () => {
      const simpleResolver = resolver({
        giraffe: query(Giraffe, {
          input: { name: silk<string>(GraphQLString) },
          resolve: (input) => {
            expectTypeOf(input).toEqualTypeOf<{ name: string }>()
            return {
              name: input.name,
              birthday: new Date(),
              heightInMeters: 5,
            }
          },
        }),
        createGiraffe: mutation(Giraffe, {
          input: GiraffeInput,
          resolve: (input) => {
            expectTypeOf(input).toEqualTypeOf<Partial<IGiraffe>>()
            return {
              name: input.name ?? "Giraffe",
              birthday: input.birthday ?? new Date(),
              heightInMeters: input.heightInMeters ?? 5,
            }
          },
        }),
      })

      expectTypeOf(
        simpleResolver.giraffe.resolve
      ).returns.resolves.toEqualTypeOf<IGiraffe>()

      expectTypeOf(simpleResolver.giraffe.resolve)
        .parameter(0)
        .toEqualTypeOf<{ name: string }>()

      expectTypeOf(simpleResolver.createGiraffe.resolve)
        .parameter(0)
        .toEqualTypeOf<Partial<IGiraffe>>()
    })
  })

  describe("field", () => {
    it("should infer parent, output and input type", () => {
      const simpleResolver = resolver.of(Giraffe, {
        age: field(silk<number>(GraphQLInt), async (giraffe) => {
          expectTypeOf(giraffe).toEqualTypeOf<IGiraffe>()
          return new Date().getFullYear() - giraffe.birthday.getFullYear()
        }),
        greeting: field(silk<string>(GraphQLString), {
          input: { myName: silk<string | undefined>(GraphQLString) },
          resolve: (giraffe, input) => {
            expectTypeOf(giraffe).toEqualTypeOf<IGiraffe>()
            expectTypeOf(input).toEqualTypeOf<{ myName: string | undefined }>()
            return `Hello, ${input.myName ?? "my friend"}! My name is ${giraffe.name}.`
          },
        }),
      })
      expectTypeOf(simpleResolver.age.resolve)
        .parameter(0)
        .toEqualTypeOf<IGiraffe>()

      expectTypeOf(
        simpleResolver.age.resolve
      ).returns.resolves.toEqualTypeOf<number>()
    })
  })

  describe("subscription", () => {
    it("should infer output, input and subscribing data type", () => {
      const simpleResolver = resolver.of(Giraffe, {
        newGiraffe: subscription(Giraffe, {
          input: GiraffeInput,
          subscribe: async function* (data) {
            expectTypeOf(data).toEqualTypeOf<Partial<IGiraffe>>()
            yield data.name ?? ""
          },
          resolve: (name) => {
            expectTypeOf(name).toEqualTypeOf<string>()
            return {
              name,
              birthday: new Date(),
              heightInMeters: 5,
            }
          },
        }),
      })
      expectTypeOf(
        simpleResolver.newGiraffe.resolve
      ).returns.resolves.toEqualTypeOf<IGiraffe>()
    })
  })
})
