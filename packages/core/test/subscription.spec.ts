import { GraphQLString, parse, subscribe } from "graphql"
import { assert, describe, expect, it } from "vitest"
import {
  GraphQLSchemaLoom,
  type Middleware,
  type ResolverPayload,
  loom,
  silk,
  useResolverPayload,
} from "../src"

const { subscription, resolver, query } = loom

describe("subscription integration", () => {
  async function* fooGenerator() {
    yield "FooValue"
  }
  const hello = query(silk(GraphQLString), () => "Hello")
  const document = parse("subscription { foo }")

  it("should work using chian", () => {
    const s = subscription
      .input(silk(GraphQLString))
      .output(silk(GraphQLString))
      .description("a simple subscription")
      .subscribe(fooGenerator)

    expect(s).toBeDefined()
    expect(s).toMatchObject({
      description: "a simple subscription",
      type: "subscription",
    })

    const s2 = subscription(silk(GraphQLString))
      .input(silk(GraphQLString))
      .description("a simple subscription")
      .subscribe(fooGenerator)

    expect(s2).toBeDefined()
    expect(s2).toMatchObject({
      description: "a simple subscription",
      type: "subscription",
    })
  })

  it("should accepts sync subscribe function", async () => {
    const simpleResolver = resolver({
      hello,
      foo: subscription.output(silk(GraphQLString)).subscribe(fooGenerator),
    })

    const schema = new GraphQLSchemaLoom()
      .add(simpleResolver)
      .weaveGraphQLSchema()

    const subscriber = await subscribe({ schema, document })

    assert(isAsyncIterable(subscriber))

    expect(await subscriber.next()).toMatchObject({
      done: false,
      value: {
        data: { foo: "FooValue" },
      },
    })
  })

  it("should accepts async subscribe function", async () => {
    const simpleResolver = resolver({
      hello,
      foo: subscription.output(silk(GraphQLString)).subscribe(async () => {
        await new Promise((resolve) => setTimeout(resolve, 6))
        return fooGenerator()
      }),
    })

    const schema = new GraphQLSchemaLoom()
      .add(simpleResolver)
      .weaveGraphQLSchema()

    const subscriber = await subscribe({ schema, document })

    assert(isAsyncIterable(subscriber))

    expect(await subscriber.next()).toMatchObject({
      done: false,
      value: {
        data: { foo: "FooValue" },
      },
    })
  })

  it("should accepts resolve function", async () => {
    const simpleResolver = resolver({
      hello,
      foo: subscription(silk(GraphQLString), {
        subscribe: fooGenerator,
        resolve(value) {
          return value + " Resolved"
        },
      }),
    })

    const schema = new GraphQLSchemaLoom()
      .add(simpleResolver)
      .weaveGraphQLSchema()

    const subscriber = await subscribe({ schema, document })

    assert(isAsyncIterable(subscriber))

    expect(await subscriber.next()).toMatchObject({
      done: false,
      value: {
        data: { foo: "FooValue Resolved" },
      },
    })
  })

  it("should accepts resolve function using chain factory", async () => {
    const simpleResolver = resolver({
      hello,
      foo: subscription
        .output(silk(GraphQLString))
        .input({ suffix: silk(GraphQLString) })
        .subscribe(fooGenerator)
        .resolve((value, input) => value + (input.suffix ?? "")),
    })

    const schema = new GraphQLSchemaLoom()
      .add(simpleResolver)
      .weaveGraphQLSchema()

    const document = parse(`subscription { foo(suffix: " Resolved") }`)
    const subscriber = await subscribe({ schema, document })

    assert(isAsyncIterable(subscriber))

    expect(await subscriber.next()).toMatchObject({
      done: false,
      value: {
        data: { foo: "FooValue Resolved" },
      },
    })
  })

  it("should work with middlewares", async () => {
    const logs: string[] = []

    const fieldMiddleware: Middleware = async (next) => {
      logs.push("Field Start")
      const answer = await next()
      logs.push("Field End")
      return answer
    }
    const resolverMiddleware: Middleware = async (next) => {
      logs.push("Resolver Start")
      const answer = await next()
      logs.push("Resolver End")
      return answer
    }
    const globalMiddleware: Middleware = async (next) => {
      logs.push("Global Start")
      const answer = await next()
      logs.push("Global End")
      return answer
    }

    const simpleResolver = resolver(
      {
        hello,
        foo: subscription(silk(GraphQLString), {
          async subscribe() {
            await new Promise((resolve) => setTimeout(resolve, 6))
            return fooGenerator()
          },
          middlewares: [fieldMiddleware],
        }),
      },
      { middlewares: [resolverMiddleware] }
    )

    const schema = new GraphQLSchemaLoom()
      .use(globalMiddleware)
      .add(simpleResolver)
      .weaveGraphQLSchema()

    const subscriber = await subscribe({ schema, document })

    assert(isAsyncIterable(subscriber))
    expect(await subscriber.next()).toMatchObject({
      done: false,
      value: {
        data: { foo: "FooValue" },
      },
    })

    expect(logs).toEqual([
      "Global Start",
      "Resolver Start",
      "Field Start",
      "Field End",
      "Resolver End",
      "Global End",
    ])
  })

  it("should work with context", async () => {
    const payloads = {} as Record<
      "subscribe" | "resolve" | "middleware",
      ResolverPayload | undefined
    >

    const middleware: Middleware = (next) => {
      payloads.middleware = useResolverPayload()
      return next()
    }

    const simpleResolver = resolver(
      {
        hello,
        foo: subscription(silk(GraphQLString), {
          async subscribe() {
            await new Promise((resolve) => setTimeout(resolve, 6))
            payloads.subscribe = useResolverPayload()
            return fooGenerator()
          },
          resolve(value) {
            payloads.resolve = useResolverPayload()
            return value + " Resolved"
          },
        }),
      },
      { middlewares: [middleware] }
    )

    const schema = new GraphQLSchemaLoom()
      .add(simpleResolver)
      .weaveGraphQLSchema()

    const contextValue = {}
    const subscriber = await subscribe({
      schema,
      document,
      contextValue,
    })

    assert(isAsyncIterable(subscriber))

    expect(await subscriber.next()).toMatchObject({
      done: false,
      value: {
        data: { foo: "FooValue Resolved" },
      },
    })

    expect(payloads.resolve).toBeDefined()
    expect(payloads.resolve?.context).toBe(contextValue)
    expect(payloads.resolve?.root).toBe("FooValue")
    expect(payloads.resolve?.info).toMatchObject({ fieldName: "foo" })
    expect(payloads.resolve?.field).toMatchObject(simpleResolver.foo)

    expect(payloads.subscribe).toBeDefined()
    expect(payloads.subscribe?.context).toBe(contextValue)
    expect(payloads.subscribe?.root).toBe(undefined)
    expect(payloads.subscribe?.info).toMatchObject({ fieldName: "foo" })
    expect(payloads.subscribe?.field).toMatchObject(simpleResolver.foo)

    expect(payloads.middleware).toBeDefined()
    expect(payloads.middleware?.context).toBe(contextValue)
    expect(payloads.middleware?.root).toBe(undefined)
    expect(payloads.middleware?.info).toMatchObject({ fieldName: "foo" })
    expect(payloads.middleware?.field).toMatchObject(simpleResolver.foo)
  })
})

/**
 * Returns true if the provided object implements the AsyncIterator protocol via
 * implementing a `Symbol.asyncIterator` method.
 */
function isAsyncIterable(
  maybeAsyncIterable: any
): maybeAsyncIterable is AsyncIterable<unknown> {
  return typeof maybeAsyncIterable?.[Symbol.asyncIterator] === "function"
}
