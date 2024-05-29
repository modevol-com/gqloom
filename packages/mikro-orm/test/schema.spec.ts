import { describe, it, expect } from "vitest"
import { printType } from "graphql"
import { mikroSilk } from "../src"
import { EntitySchema } from "@mikro-orm/core"

const nullable = true

describe("MikroSilk", () => {
  it("should handle object", () => {
    interface IBook {
      title: string
      isPublished: boolean
      price: number
      tags: string[]
    }
    const BookSchema = new EntitySchema<IBook>({
      name: "Book",
      properties: {
        title: { type: "string" },
        isPublished: { type: "boolean" },
        price: { type: "number", nullable },
        tags: { type: "string[]", array: true },
      },
    })

    const gqlType = mikroSilk(BookSchema).getGraphQLType()
    expect(printType(gqlType)).toMatchInlineSnapshot(`
      "type Book {
        title: String!
        isPublished: Boolean!
        price: Float
        tags: [String!]!
      }"
    `)
  })
})
