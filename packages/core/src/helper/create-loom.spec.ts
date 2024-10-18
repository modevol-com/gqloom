import { describe, expect, it } from "vitest"
import {
  createQueryFactory,
  createMutationFactory,
  createFieldFactory,
  createSubscriptionFactory,
  createResolverFactory,
  createLoom,
} from "./create-loom"
import { silk, type GraphQLSilkIO } from "../resolver"
import { SYMBOLS } from "../utils"
import { GraphQLObjectType, GraphQLString } from "graphql"

function toSilk(schema: GraphQLSilkIO[0]) {
  return schema
}

function isSchema(schema: any) {
  return SYMBOLS.GET_GRAPHQL_TYPE in schema
}

describe("create loom", () => {
  it("should create a queryFactory", () => {
    const queryFactory = createQueryFactory<GraphQLSilkIO>(toSilk, isSchema)

    expect(queryFactory).toBeDefined()
    expect(queryFactory).toBeInstanceOf(Function)
  })

  it("should create a mutationFactory", () => {
    const mutationFactory = createMutationFactory<GraphQLSilkIO>(
      toSilk,
      isSchema
    )

    expect(mutationFactory).toBeDefined()
    expect(mutationFactory).toBeInstanceOf(Function)
  })

  it("should create a fieldFactory", () => {
    const fieldFactory = createFieldFactory<GraphQLSilkIO>(toSilk, isSchema)

    expect(fieldFactory).toBeDefined()
    expect(fieldFactory).toBeInstanceOf(Function)
    expect(fieldFactory.hidden).toBe(SYMBOLS.FIELD_HIDDEN)
  })

  it("should create a subscriptionFactory", () => {
    const subscriptionFactory = createSubscriptionFactory<GraphQLSilkIO>(
      toSilk,
      isSchema
    )

    expect(subscriptionFactory).toBeDefined()
    expect(subscriptionFactory).toBeInstanceOf(Function)
  })

  it("should create a resolverFactory", () => {
    const resolverFactory = createResolverFactory<GraphQLSilkIO>(toSilk)

    expect(resolverFactory).toBeDefined()
    expect(resolverFactory).toBeInstanceOf(Function)
    expect(resolverFactory.of).toBeInstanceOf(Function)
  })

  it("should create a loom", () => {
    const loom = createLoom<GraphQLSilkIO>(toSilk, isSchema)

    expect(loom).toBeDefined()
    expect(loom).toBeInstanceOf(Object)
    expect(loom.query).toBeDefined()
    expect(loom.mutation).toBeDefined()
    expect(loom.field).toBeDefined()
    expect(loom.subscription).toBeDefined()
    expect(loom.resolver).toBeDefined()
  })

  describe("factories", () => {
    const loom = createLoom<GraphQLSilkIO>(toSilk, isSchema)
    it("should create a query", () => {
      const query = loom.query(silk(GraphQLString), () => "")

      expect(query).toBeDefined()
    })

    it("should create a mutation", () => {
      const mutation = loom.mutation(silk(GraphQLString), {
        input: { name: silk(GraphQLString) },
        resolve: () => "",
      })

      expect(mutation).toBeDefined()
    })

    it("should create a subscription", () => {
      const subscription = loom.subscription(
        silk(GraphQLString),
        () => "" as any
      )

      expect(subscription).toBeDefined()
    })

    it("should create a field", () => {
      const Cat = silk<{ name: string }>(
        new GraphQLObjectType({
          name: "Cat",
          fields: {
            name: { type: GraphQLString },
          },
        })
      )

      const Input = silk<{ name: string }>(
        new GraphQLObjectType({
          name: "Input",
          fields: {
            name: { type: GraphQLString },
          },
        })
      )

      const r = loom.resolver.of(Cat, {
        hello: loom.field(silk(GraphQLString), {
          input: Input,
          resolve: (input) => input.name,
        }),
      })

      expect(r).toBeDefined()
    })
  })
})
