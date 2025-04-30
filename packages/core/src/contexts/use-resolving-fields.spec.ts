import { GraphQLObjectType, GraphQLString, execute, parse } from "graphql"
import { describe, expect, it } from "vitest"
import { field, query, resolver, silk } from "../resolver"
import { weave } from "../schema"
import { useResolvingFields } from "./use-resolving-fields"

describe("useResolvingFields", () => {
  const Cat = silk(
    new GraphQLObjectType<{
      firstName?: string
      lastName?: string
    }>({
      name: "Cat",
      fields: {
        firstName: { type: GraphQLString },
        lastName: { type: GraphQLString },
      },
    })
  )

  let resolvingFields: Set<string> | undefined
  let selectedFields: Set<string> | undefined

  const CatResolver = resolver.of(Cat, {
    cat: query(Cat).resolve(() => {
      resolvingFields = useResolvingFields()?.resolvingFields
      selectedFields = useResolvingFields()?.selectedFields
      return {
        firstName: "John",
        lastName: "Doe",
      }
    }),

    fullname: field(silk(GraphQLString))
      .select("firstName", "lastName")
      .resolve((cat) => {
        return `${cat.firstName} ${cat.lastName}`
      }),
  })

  const schema = weave(CatResolver)

  it("should return the resolving fields", async () => {
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        query {
          cat {
            firstName
            lastName
          }
        }
      `),
    })
    expect(result.errors).toBeUndefined()
    expect(resolvingFields).toEqual(new Set(["firstName", "lastName"]))
    expect(selectedFields).toEqual(new Set(["firstName", "lastName"]))
  })

  it("should return the derived dependencies", async () => {
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        query {
          cat {
            fullname
          }
        }
      `),
    })
    expect(result.errors).toBeUndefined()
    expect(resolvingFields).toEqual(new Set(["fullname"]))
    expect(selectedFields).toEqual(new Set(["firstName", "lastName"]))
  })
})
