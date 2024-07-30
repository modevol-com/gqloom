import {
  GraphQLInt,
  GraphQLObjectType,
  GraphQLString,
  printType,
} from "graphql"
import { describe, expect, it } from "vitest"
import { LoomObjectType } from "./object"
import {
  defaultSubscriptionResolve,
  silk,
  silkField,
  silkMutation,
  silkQuery,
  silkSubscription,
} from "../resolver"

describe("printType", () => {
  it("should print type correctly", () => {
    const Dog = new GraphQLObjectType({
      name: "Dog",
      fields: {
        name: { type: GraphQLString },
        age: { type: GraphQLInt },
      },
    })

    expect(printType(Dog)).toMatchInlineSnapshot(`
      "type Dog {
        name: String
        age: Int
      }"
    `)
  })
})

describe("LoomObjectType", () => {
  it("should weave object with Extra fields correctly", () => {
    const Dog = new LoomObjectType({ name: "Dog", fields: {} })
    Dog.addField(
      "name",
      silkField(silk<string, string>(GraphQLString), () => "")
    )
    Dog.addField(
      "age",
      silkField(silk<number, number>(GraphQLInt), () => 0)
    )
    expect(printType(Dog)).toMatchInlineSnapshot(`
      "type Dog {
        name: String
        age: Int
      }"
    `)
  })
})

describe("toFieldConfig", () => {
  const StringSilk = silk<string, string>(GraphQLString)
  const IntSilk = silk<number, number>(GraphQLInt)
  const loomObject = new LoomObjectType("test")

  it("should work with Field", () => {
    const fieldConfig = loomObject.toFieldConfig(
      silkField(StringSilk, () => "")
    )
    expect(fieldConfig).toHaveProperty("type", GraphQLString)
    expect(fieldConfig).toHaveProperty("resolve")
    expect(fieldConfig).not.toHaveProperty("subscribe")
  })

  it("should work with Subscription", () => {
    const fieldConfig = loomObject.toFieldConfig(
      silkSubscription(StringSilk, async function* () {
        yield ""
      })
    )
    expect(fieldConfig).toHaveProperty("type", GraphQLString)
    expect(fieldConfig).toHaveProperty("subscribe")
    expect(fieldConfig).toHaveProperty("resolve", defaultSubscriptionResolve)
  })

  it("should work with Query", () => {
    const fieldConfig = loomObject.toFieldConfig(
      silkQuery(StringSilk, () => "")
    )
    expect(fieldConfig).toHaveProperty("type", GraphQLString)
    expect(fieldConfig).toHaveProperty("resolve")
    expect(fieldConfig).not.toHaveProperty("subscribe")
  })

  it("should work with Mutation", () => {
    const fieldConfig = loomObject.toFieldConfig(
      silkMutation(StringSilk, () => "")
    )
    expect(fieldConfig).toHaveProperty("type", GraphQLString)
    expect(fieldConfig).toHaveProperty("resolve")
    expect(fieldConfig).not.toHaveProperty("subscribe")
  })

  it("should parse input", async () => {
    const PlusOneSilk = silk<number, number>(GraphQLInt, async (n) => {
      await new Promise((ok) => setTimeout(ok, 6))
      return n + 1
    })
    const fieldConfig = loomObject.toFieldConfig(
      silkQuery(IntSilk, {
        input: { n: PlusOneSilk },
        resolve: ({ n }) => n,
      })
    )
    const n = Math.floor(Math.random() * 100)
    expect(await fieldConfig.resolve?.(0, { n }, {}, {} as any)).toBe(n + 1)
  })

  it("should provide Resolver Payload", async () => {
    let rootRef: any
    const fieldConfig = loomObject.toFieldConfig(
      silkField(IntSilk, {
        resolve: (root) => {
          rootRef = root
          return 0
        },
      })
    )
    const root = { n: 1 }
    await fieldConfig.resolve?.(root, {}, {}, {} as any)
    expect(rootRef).toBe(root)
  })
})
