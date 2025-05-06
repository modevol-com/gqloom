import { GraphQLString, parse, subscribe } from "graphql"
import { assert, describe, expect, it } from "vitest"
import {
  GraphQLSchemaLoom,
  type Loom,
  type Middleware,
  type ResolverPayload,
  loom,
  silk,
  weave,
} from "../src"
import { asyncContextProvider, useResolverPayload } from "../src/context"

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
    expect(s["~meta"]).toMatchObject({
      description: "a simple subscription",
      operation: "subscription",
    })

    const s2 = subscription(silk(GraphQLString))
      .input(silk(GraphQLString))
      .description("a simple subscription")
      .subscribe(fooGenerator)

    expect(s2).toBeDefined()
    expect(s2["~meta"]).toMatchObject({
      description: "a simple subscription",
      operation: "subscription",
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
        foo: subscription(silk(GraphQLString))
          .use(fieldMiddleware)
          .subscribe(async () => {
            await new Promise((resolve) => setTimeout(resolve, 6))
            return fooGenerator()
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
      "subscribe" | "resolve" | "middleware" | "iterator",
      ResolverPayload | undefined
    >

    let subscribePayload: ResolverPayload | undefined
    let resolvePayload: ResolverPayload | undefined

    const middleware: Middleware = (next) => {
      payloads.middleware = useResolverPayload()
      return next()
    }

    const simpleResolver = resolver(
      {
        hello,
        foo: subscription(silk(GraphQLString))
          .subscribe((_input, payload) => {
            subscribePayload = payload
            payloads.subscribe = useResolverPayload()
            return fooGenerator()
          })
          .resolve(async (value, _input, payload) => {
            resolvePayload = payload
            payloads.resolve = useResolverPayload()
            return value + " Resolved"
          }),
      },
      { middlewares: [middleware] }
    )

    const schema = weave(asyncContextProvider, simpleResolver)

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

    expect(subscribePayload).toBeDefined()
    expect(subscribePayload?.info.fieldName).toBe("foo")
    expect(resolvePayload).toBeDefined()
    expect(resolvePayload?.info.fieldName).toBe("foo")

    expect(payloads.resolve).toBeDefined()
    expect(payloads.resolve?.context).toBe(contextValue)
    expect(payloads.resolve?.root).toBe("FooValue")
    expect(payloads.resolve?.info).toMatchObject({ fieldName: "foo" })
    expect(payloads.resolve?.field["~meta"]).toMatchObject(
      reField(simpleResolver["~meta"].fields.foo["~meta"])
    )

    expect(payloads.subscribe).toBeDefined()
    expect(payloads.subscribe?.context).toBe(contextValue)
    expect(payloads.subscribe?.root).toBe(undefined)
    expect(payloads.subscribe?.info).toMatchObject({ fieldName: "foo" })
    expect(payloads.subscribe?.field["~meta"]).toMatchObject(
      reField(simpleResolver["~meta"].fields.foo["~meta"])
    )

    expect(payloads.middleware).toBeDefined()
    expect(payloads.middleware?.context).toBe(contextValue)
    expect(payloads.middleware?.root).toBe(undefined)
    expect(payloads.middleware?.info).toMatchObject({ fieldName: "foo" })
    expect(payloads.middleware?.field["~meta"]).toMatchObject(
      reField(simpleResolver["~meta"].fields.foo["~meta"])
    )
  })

  it("should work with context in async iterator", async () => {
    let iteratorPayload: ResolverPayload | undefined

    const contextValue = {}

    const payloads = {} as Record<
      "subscribe" | "resolve" | "middleware" | "iterator",
      ResolverPayload | undefined
    >

    const iteratorResolver = resolver({
      hello,
      foo: subscription(silk(GraphQLString)).subscribe(
        async function* (_input, payload) {
          await new Promise((resolve) => setTimeout(resolve, 6))
          iteratorPayload = payload
          payloads.iterator = useResolverPayload()
          yield "FooValue"
        }
      ),
    })

    const iteratorSchema = weave(asyncContextProvider, iteratorResolver)

    const iteratorSubscriber = await subscribe({
      schema: iteratorSchema,
      document,
      contextValue,
    })

    assert(isAsyncIterable(iteratorSubscriber))

    expect(await iteratorSubscriber.next()).toMatchObject({
      done: false,
      value: {
        data: { foo: "FooValue" },
      },
    })

    expect(iteratorPayload).toBeDefined()
    expect(iteratorPayload?.info.fieldName).toBe("foo")

    expect(payloads.iterator).toBeDefined()
    expect(payloads.iterator?.context).toBe(contextValue)
    expect(payloads.iterator?.root).toBe(undefined)
    expect(payloads.iterator?.info).toMatchObject({ fieldName: "foo" })
    expect(payloads.iterator?.field["~meta"]).toMatchObject(
      reField(iteratorResolver["~meta"].fields.foo["~meta"])
    )
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

const reField = ({
  operation,
  output,
  input,
  deprecationReason,
  description,
  extensions,
}: Loom.FieldMeta) => ({
  operation,
  output,
  input,
  deprecationReason,
  description,
  extensions,
})
