import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLObjectType,
  GraphQLString,
  printSchema,
  printType,
} from "graphql"
import { describe, expect, it } from "vitest"
import { mutation, query, resolver, silk, subscription } from "../resolver"
import { AUTO_ALIASING } from "../utils"
import { LoomObjectType } from "./object"
import { weave } from "./schema-loom"

describe("alias", () => {
  it("should auto assign alias", () => {
    const Bar = new GraphQLObjectType({
      name: AUTO_ALIASING,
      fields: {
        hello: { type: GraphQLString },
      },
    })

    const Foo = new LoomObjectType({
      name: "Foo",
      fields: {
        bar: { type: Bar },
      },
    })

    expect(printType(Foo)).toMatchInlineSnapshot(`
    "type Foo {
      bar: FooBar
    }"
  `)
  })

  it("should auto assign alias for operations", () => {
    const Foo = new GraphQLObjectType({
      name: AUTO_ALIASING,
      fields: () => ({
        baz: { type: Baz },
      }),
    })
    const Bar = new GraphQLObjectType({
      name: AUTO_ALIASING,
      fields: {
        hello: { type: GraphQLString },
        foo: { type: Foo },
      },
    })
    const Baz = new GraphQLObjectType({
      name: AUTO_ALIASING,
      fields: {
        bar: { type: GraphQLString },
      },
    })

    const r = resolver({
      addBar: mutation(silk(Bar), () => ({ hello: "world" })),
      watchBar: subscription(silk(Bar), async function* () {
        yield { hello: "world" }
      }),
      bar: query(silk(Bar), () => ({ hello: "world" })),
    })

    const schema = weave(r)
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type Query {
        bar: Bar
      }

      type Bar {
        hello: String
        foo: BarFoo
      }

      type BarFoo {
        baz: BarFooBaz
      }

      type BarFooBaz {
        bar: String
      }

      type Mutation {
        addBar: Bar
      }

      type Subscription {
        watchBar: Bar
      }"
    `)
  })

  it("should auto assign alias for enums in Object", () => {
    const Fruit = new GraphQLEnumType({
      name: AUTO_ALIASING,
      values: {
        apple: { value: "apple" },
        banana: { value: "banana" },
        orange: { value: "orange" },
      },
    })

    const Foo = new LoomObjectType({
      name: "Foo",
      fields: {
        fruit: { type: Fruit },
      },
    })

    expect(printType(Foo)).toMatchInlineSnapshot(`
      "type Foo {
        fruit: FooFruit
      }"
    `)
  })

  it("should auto assign alias for enums in Operation", () => {
    const Fruit = new GraphQLEnumType({
      name: AUTO_ALIASING,
      values: {
        apple: { value: "apple" },
        banana: { value: "banana" },
        orange: { value: "orange" },
      },
    })

    const r = resolver({
      fruit: query(silk(Fruit), () => "apple"),
    })

    const schema = weave(r)
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type Query {
        fruit: Fruit
      }

      enum Fruit {
        apple
        banana
        orange
      }"
    `)
  })

  it("should auto assign alias for enums in Input", () => {
    const Fruit = new GraphQLEnumType({
      name: AUTO_ALIASING,
      values: {
        apple: { value: "apple" },
        banana: { value: "banana" },
        orange: { value: "orange" },
      },
    })

    const r = resolver({
      create: mutation(silk(GraphQLBoolean))
        .input({ fruit: silk(Fruit) })
        .resolve(() => true),
    })

    const schema = weave(r)
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type Mutation {
        create(fruit: CreateFruitInput): Boolean
      }

      enum CreateFruitInput {
        apple
        banana
        orange
      }"
    `)
  })

  it.todo("should auto assign alias for unions")
})
