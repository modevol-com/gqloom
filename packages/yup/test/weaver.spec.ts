import { SchemaWeaver } from "@gqloom/core"
import { describe, expect, it } from "vitest"
import { query, resolver, type YupWeaverOptions } from "../src"
import { GraphQLScalarType, printSchema } from "graphql"
import { date, object, string } from "yup"

const GraphQLDate = new GraphQLScalarType({
  name: "Date",
})

describe("Weaver with YupSilk", () => {
  it("should use preset GraphQLType", () => {
    const Dog = object({
      name: string(),
      birthday: date(),
    }).label("Dog")

    const r1 = resolver({ dog: query(Dog, () => ({})) })
    const schema = new SchemaWeaver()
      .setOptions<YupWeaverOptions>({
        yupPresetGraphQLType: (description) => {
          switch (description.type) {
            case "date":
              return GraphQLDate
          }
        },
      })
      .add(r1)
      .weaveGraphQLSchema()

    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type Query {
        dog: Dog
      }

      type Dog {
        name: String
        birthday: Date
      }

      scalar Date"
    `)
  })
})
