import {
  GraphQLInt,
  GraphQLObjectType,
  GraphQLString,
  printType,
} from "graphql"
import { describe, expect, it } from "vitest"
import { field, mutation, query, silk, subscription } from "../resolver"
import { LoomObjectType } from "./object"

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
      field(silk<string, string>(GraphQLString), () => ""),
      undefined
    )
    Dog.addField(
      "age",
      field(silk<number, number>(GraphQLInt), () => 0),
      undefined
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
      field(StringSilk, () => ""),
      ""
    )
    expect(fieldConfig).toHaveProperty("type", GraphQLString)
    expect(fieldConfig).toHaveProperty("resolve")
    expect(fieldConfig).not.toHaveProperty("subscribe")
  })

  it("should work with Subscription", () => {
    const fieldConfig = loomObject.toFieldConfig(
      subscription(StringSilk, async function* () {
        yield ""
      }),
      ""
    )
    expect(fieldConfig).toHaveProperty("type", GraphQLString)
    expect(fieldConfig).toHaveProperty("subscribe")
    expect(fieldConfig).toHaveProperty("resolve", expect.any(Function))
  })

  it("should work with Query", () => {
    const fieldConfig = loomObject.toFieldConfig(
      query(StringSilk, () => ""),
      ""
    )
    expect(fieldConfig).toHaveProperty("type", GraphQLString)
    expect(fieldConfig).toHaveProperty("resolve")
    expect(fieldConfig).not.toHaveProperty("subscribe")
  })

  it("should work with Mutation", () => {
    const fieldConfig = loomObject.toFieldConfig(
      mutation(StringSilk, () => ""),
      ""
    )
    expect(fieldConfig).toHaveProperty("type", GraphQLString)
    expect(fieldConfig).toHaveProperty("resolve")
    expect(fieldConfig).not.toHaveProperty("subscribe")
  })

  it("should parse input", async () => {
    const PlusOneSilk = silk<number, number>(GraphQLInt, async (n) => {
      await new Promise((ok) => setTimeout(ok, 6))
      return { value: n + 1 }
    })
    const fieldConfig = loomObject.toFieldConfig(
      query(IntSilk, {
        input: { n: PlusOneSilk },
        resolve: ({ n }) => n,
      }),
      ""
    )
    const n = Math.floor(Math.random() * 100)
    expect(await fieldConfig.resolve?.(0, { n }, {}, {} as any)).toBe(n + 1)
  })

  it("should provide Resolver Payload", async () => {
    let rootRef: any
    const fieldConfig = loomObject.toFieldConfig(
      field(IntSilk, {
        resolve: (root) => {
          rootRef = root
          return 0
        },
      }),
      ""
    )
    const root = { n: 1 }
    await fieldConfig.resolve?.(root, {}, {}, {} as any)
    expect(rootRef).toBe(root)
  })
})
