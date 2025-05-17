import { type RequireKeys, field, query, silk } from "@gqloom/core"
import {
  GraphQLInt,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from "graphql"
import { describe, expect, expectTypeOf, it } from "vitest"
import { resolveReference, resolver } from "../src"

describe("FederatedChainResolver", () => {
  it("should define a resolver", () => {
    const r1 = resolver({
      query: query(silk(GraphQLString), () => "foo"),
    })
    expect(r1).toBeDefined()
    expect(r1["~meta"].fields.query).toBeDefined()
  })

  it("should define a object resolver", () => {
    interface IUser {
      id: string
      name: string
    }
    const User = silk<IUser>(
      new GraphQLObjectType({
        name: "User",
        fields: {
          id: { type: new GraphQLNonNull(GraphQLString) },
          name: { type: new GraphQLNonNull(GraphQLString) },
        },
        extensions: {
          directives: { key: { fields: "id", resolvable: true } },
          ...resolveReference<IUser, "id">(({ id }) => ({ id, name: "@ava" })),
        },
      })
    )
    const r1 = resolver.of(User, {
      query: query(silk(GraphQLString), () => "foo"),
    })
    expect(r1).toBeDefined()
    expect(r1["~meta"].fields.query).toBeDefined()
    expect(r1["~meta"].parent).toBe(User)
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
})
