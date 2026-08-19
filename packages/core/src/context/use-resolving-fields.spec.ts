import { execute, GraphQLObjectType, GraphQLString, parse } from "graphql"
import { describe, expect, it } from "vitest"
import { field, query, resolver, silk } from "../resolver"
import { weave } from "../schema"
import type { ResolvingFields } from "../utils"
import { asyncContextProvider } from "./context"
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

  let resolvingFields: ResolvingFields | undefined

  const CatResolver = resolver.of(Cat, {
    cat: query(Cat).resolve(() => {
      resolvingFields = useResolvingFields()
      return {
        firstName: "John",
        lastName: "Doe",
      }
    }),

    fullname: field(silk(GraphQLString))
      .derivedFrom("firstName", "lastName")
      .resolve((cat) => {
        return `${cat.firstName} ${cat.lastName}`
      }),
  })

  const schema = weave(asyncContextProvider, CatResolver)

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
    expect(resolvingFields?.requestedFields).toEqual(
      new Set(["firstName", "lastName"])
    )
    expect(resolvingFields?.selectedFields).toEqual(
      new Set(["firstName", "lastName"])
    )
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
    expect(resolvingFields?.requestedFields).toEqual(new Set(["fullname"]))
    expect(resolvingFields?.selectedFields).toEqual(
      new Set(["firstName", "lastName"])
    )
  })
})
