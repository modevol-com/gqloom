import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLObjectType,
  GraphQLString,
  GraphQLUnionType,
  printSchema,
  printType,
} from "graphql"
import { describe, expect, it } from "vitest"
import { mutation, query, resolver, silk, subscription } from "../resolver"
import { AUTO_ALIASING } from "../utils"
import { LoomObjectType } from "./object"
import { weave } from "./schema-loom"

describe("alias", () => {
  it("should auto assign alias for objects", () => {
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

  it("should auto assign alias for objects in operations", () => {
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

  it("should auto assign alias for enums", () => {
    const Fruit = new GraphQLEnumType({
      name: AUTO_ALIASING,
      values: {
        apple: { value: "apple" },
        banana: { value: "banana" },
        orange: { value: "orange" },
      },
    })

    const Bar = new GraphQLObjectType<{ fruit: string }>({
      name: "Bar",
      fields: {
        fruit: { type: Fruit },
      },
    })
    const r = resolver({
      fruit: query(silk.list(silk(Fruit)), () => ["apple"]),

      bar: query(silk(Bar), () => ({ fruit: "apple" })),

      createBar: mutation(silk(Bar))
        .input({ fruit: silk(Fruit) })
        .resolve(({ fruit }) => fruit),
    })

    const schema = weave(r)
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type Query {
        fruit: [Fruit]!
        bar: Bar
      }

      enum Fruit {
        apple
        banana
        orange
      }

      type Bar {
        fruit: Fruit
      }

      type Mutation {
        createBar(fruit: Fruit): Bar
      }"
    `)
  })

  it("should auto assign alias for unions in Object", () => {
    const Dog = new GraphQLObjectType({
      name: AUTO_ALIASING,
      fields: {
        name: { type: GraphQLString },
        loveBone: { type: GraphQLBoolean },
      },
    })

    const Cat = new GraphQLObjectType({
      name: AUTO_ALIASING,
      fields: {
        name: { type: GraphQLString },
        loveFish: { type: GraphQLBoolean },
      },
    })

    const Animal = new GraphQLUnionType({
      name: AUTO_ALIASING,
      types: [Dog, Cat],
    })

    const Foo = new LoomObjectType({
      name: "Foo",
      fields: {
        animal: { type: Animal },
      },
    })

    expect(printType(Foo)).toMatchInlineSnapshot(`
      "type Foo {
        animal: FooAnimal
      }"
    `)
  })

  it("should auto assign alias for unions in Operation", () => {
    const Dog = new GraphQLObjectType({
      name: AUTO_ALIASING,
      fields: {
        name: { type: GraphQLString },
        loveBone: { type: GraphQLBoolean },
      },
    })

    const Cat = new GraphQLObjectType({
      name: AUTO_ALIASING,
      fields: {
        name: { type: GraphQLString },
        loveFish: { type: GraphQLBoolean },
      },
    })

    const Animal = new GraphQLUnionType({
      name: AUTO_ALIASING,
      types: [Dog, Cat],
    })

    const r = resolver({
      animal: query(silk(Animal), () => ({ name: "Rex", loveBone: true })),
    })

    const schema = weave(r)
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type Query {
        animal: Animal
      }

      union Animal = Animal1 | Animal2

      type Animal1 {
        name: String
        loveBone: Boolean
      }

      type Animal2 {
        name: String
        loveFish: Boolean
      }"
    `)
  })

  it("should auto assign alias for unions", () => {
    const Dog = new GraphQLObjectType({
      name: AUTO_ALIASING,
      fields: {
        name: { type: GraphQLString },
        loveBone: { type: GraphQLBoolean },
      },
    })

    const Cat = new GraphQLObjectType({
      name: AUTO_ALIASING,
      fields: {
        name: { type: GraphQLString },
        loveFish: { type: GraphQLBoolean },
      },
    })

    const Animal = new GraphQLUnionType({
      name: AUTO_ALIASING,
      types: [Dog, Cat],
    })

    const Foo = new GraphQLObjectType({
      name: "Foo",
      fields: {
        animal: { type: Animal },
      },
    })

    const r = resolver({
      animal: query(silk(Animal), () => ({ name: "Rex", loveBone: true })),
      foo: query(silk(Foo), () => ({
        animal: { name: "Rex", loveBone: true },
      })),
    })

    const schema = weave(r)
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type Query {
        animal: Animal
        foo: Foo
      }

      union Animal = Animal1 | Animal2

      type Animal1 {
        name: String
        loveBone: Boolean
      }

      type Animal2 {
        name: String
        loveFish: Boolean
      }

      type Foo {
        animal: Animal
      }"
    `)
  })
})
