import { beforeAll, describe, expect, it } from "vitest"
import { type Middleware, loom, silk, SchemaWeaver } from "../src"
import { GraphQLString, parse, execute } from "graphql"

const { query, resolver } = loom

describe("middleware integration", () => {
  const logs: string[] = []
  const operationMiddleware: Middleware = async (next) => {
    logs.push("operation Start")
    const result = await next()
    logs.push("operation End")
    return result
  }
  const resolverMiddleware: Middleware = async (next) => {
    logs.push("resolver Start")
    const result = await next()
    logs.push("resolver End")
    return result
  }
  const globalMiddleware: Middleware = async (next) => {
    logs.push("global Start")
    const result = await next()
    logs.push("global End")
    return result
  }
  const simpleResolver = resolver(
    {
      hello: query(silk(GraphQLString), {
        resolve: () => "hello GQLoom",
        middlewares: [operationMiddleware],
      }),
    },
    { middlewares: [resolverMiddleware] }
  )

  const schema = new SchemaWeaver()
    .use(globalMiddleware)
    .addResolver(simpleResolver)
    .weaveGraphQLSchema()

  beforeAll(async () => {
    await execute({
      schema,
      document: parse(/* GraphQL */ `
        query {
          hello
        }
      `),
    })
  })

  it("should work in operation", async () => {
    expect(logs).toContain("operation Start")
    expect(logs).toContain("operation End")
  })
  it("should work in resolver", async () => {
    expect(logs).toContain("resolver Start")
    expect(logs).toContain("resolver End")
  })
  it("should work in global", async () => {
    expect(logs).toContain("global Start")
    expect(logs).toContain("global End")
  })
  it("should work in order", async () => {
    expect(logs).toEqual([
      "global Start",
      "resolver Start",
      "operation Start",
      "operation End",
      "resolver End",
      "global End",
    ])
  })
})
