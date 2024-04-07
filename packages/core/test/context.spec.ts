import { beforeAll, describe, expect, it } from "vitest"
import {
  type Middleware,
  loom,
  silk,
  SchemaWeaver,
  useResolverPayload,
  type ResolverPayload,
  createMemory,
} from "../src"
import {
  GraphQLString,
  parse,
  execute,
  GraphQLObjectType,
  GraphQLInt,
  type ExecutionResult,
  GraphQLFloat,
} from "graphql"

const { query, resolver, field } = loom

describe("context integration", () => {
  const payloads = {} as Record<
    | "operationMiddleware"
    | "resolverMiddleware"
    | "globalMiddleware"
    | "helloResolver",
    ResolverPayload | undefined
  >

  const payloadsInNode: (ResolverPayload | undefined)[] = []

  const operationMiddleware: Middleware = (next) => {
    payloads.operationMiddleware = useResolverPayload()
    return next()
  }
  const resolverMiddleware: Middleware = (next) => {
    payloads.resolverMiddleware = useResolverPayload()
    return next()
  }
  const globalMiddleware: Middleware = (next) => {
    payloads.globalMiddleware = useResolverPayload()
    return next()
  }
  const simpleResolver = resolver(
    {
      hello: query(silk<string>(GraphQLString), {
        input: { name: silk<string>(GraphQLString) },
        resolve: ({ name }) => {
          payloads.helloResolver = useResolverPayload()
          return `hello ${name}`
        },
        middlewares: [operationMiddleware],
      }),
    },
    { middlewares: [resolverMiddleware] }
  )

  const NodeSilk = silk<{ value: number }>(
    new GraphQLObjectType({
      name: "Node",
      fields: { value: { type: GraphQLInt } },
    })
  )

  const nodeResolver = resolver.of(NodeSilk, {
    next: field(NodeSilk, (prev) => {
      const value = prev.value + 1
      payloadsInNode[value] = useResolverPayload()
      return { value }
    }),
    node: query(NodeSilk, () => {
      payloadsInNode[0] = useResolverPayload()
      return { value: 0 }
    }),
  })

  const schema = new SchemaWeaver()
    .use(globalMiddleware)
    .addResolver(simpleResolver)
    .addResolver(nodeResolver)
    .weaveGraphQLSchema()

  const contextValue = {}
  const rootValue = {}
  let result: any

  beforeAll(async () => {
    result = await execute({
      schema,
      contextValue,
      rootValue,
      document: parse(/* GraphQL */ `
        query {
          hello(name: "world")
          node {
            value
            next {
              value
              next {
                value
              }
            }
          }
        }
      `),
    })
  })

  it("should execute", () => {
    expect(result).toMatchInlineSnapshot(`
      {
        "data": {
          "hello": "hello world",
          "node": {
            "next": {
              "next": {
                "value": 2,
              },
              "value": 1,
            },
            "value": 0,
          },
        },
      }
    `)
  })

  it("should get payload", () => {
    expect(payloads.helloResolver).toBeDefined()
    expect(payloads.helloResolver?.context).toBe(contextValue)
    expect(payloads.helloResolver?.root).toBe(rootValue)
    expect(payloads.helloResolver?.info).toMatchObject({ fieldName: "hello" })
    expect(payloads.helloResolver?.field).toMatchObject(simpleResolver.hello)
    expect(payloads.helloResolver?.args).toMatchObject({ name: "world" })
  })

  it("should available in node", () => {
    expect(payloadsInNode[0]).toBeDefined()
    expect(payloadsInNode[0]?.context).toBe(contextValue)
    expect(payloadsInNode[0]?.root).toBe(rootValue)
    expect(payloadsInNode[0]?.info).toMatchObject({ fieldName: "node" })
    expect(payloadsInNode[0]?.field).toBe(nodeResolver.node)

    expect(payloadsInNode[1]).toBeDefined()
    expect(payloadsInNode[1]?.context).toBe(contextValue)
    expect(payloadsInNode[1]?.root).toEqual({ value: 0 })
    expect(payloadsInNode[1]?.info).toMatchObject({ fieldName: "next" })
    expect(payloadsInNode[1]?.field).toBe(nodeResolver.next)

    expect(payloadsInNode[2]).toBeDefined()
    expect(payloadsInNode[2]?.context).toBe(contextValue)
    expect(payloadsInNode[2]?.root).toEqual({ value: 1 })
    expect(payloadsInNode[2]?.info).toMatchObject({ fieldName: "next" })
    expect(payloadsInNode[2]?.field).toBe(nodeResolver.next)
  })

  it("should available in operation middleware", () => {
    expect(payloads.operationMiddleware).toBeDefined()
  })

  it("should available in resolver middleware", () => {
    expect(payloads.resolverMiddleware).toBeDefined()
  })

  it("should available in global middleware", () => {
    expect(payloads.globalMiddleware).toBeDefined()
  })

  it("should available in resolve function", () => {
    expect(payloads.helloResolver).toBeDefined()
  })
})

describe("memory integration", () => {
  const NodeSilk = silk<{ value: number }>(
    new GraphQLObjectType({
      name: "Node",
      fields: { value: { type: GraphQLFloat } },
    })
  )

  let calledTime = 0
  const useRandom = createMemory(() => {
    calledTime++
    return Math.random()
  })
  const memoried: number[] = []

  const middleware: Middleware = (next) => {
    memoried.push(useRandom())
    return next()
  }

  const nodeResolver = resolver.of(
    NodeSilk,
    {
      next: field(NodeSilk, () => {
        const value = useRandom()
        memoried.push(value)
        return { value }
      }),
      node: query(NodeSilk, {
        resolve: () => {
          const value = useRandom()
          memoried.push(value)
          return { value }
        },
        middlewares: [middleware],
      }),
    },
    { middlewares: [middleware] }
  )

  const schema = new SchemaWeaver()
    .use(middleware)
    .addResolver(nodeResolver)
    .weaveGraphQLSchema()

  const contextValue = {}

  let result:
    | undefined
    | ExecutionResult<{ node: { value: number; next: { value: number } } }>

  beforeAll(async () => {
    ;(result as any) = await execute({
      schema,
      contextValue,
      document: parse(/* GraphQL */ `
        query {
          node {
            value
            next {
              value
              next {
                value
              }
            }
          }
        }
      `),
    })
  })

  it("should keep memory", () => {
    expect(result?.data?.node.value).toEqual(result?.data?.node.next.value)
    expect(memoried.length).toBeGreaterThanOrEqual(3)
    expect(new Set(memoried).size).toEqual(1)
  })

  it("should available in resolver and middlewares", () => {
    expect(calledTime).toEqual(1)
  })

  it("should get different value in different execute", () => {
    const result2 = execute({
      schema,
      contextValue,
      document: parse(/* GraphQL */ `
        query {
          node {
            value
            next {
              value
              next {
                value
              }
            }
          }
        }
      `),
    }) as ExecutionResult<{ node: { value: number; next: { value: number } } }>

    expect(result2.data?.node.value).toEqual(result2.data?.node.next.value)
    expect(result2.data?.node.value).not.toEqual(result?.data?.node.value)
  })
})
