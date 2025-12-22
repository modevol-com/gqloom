import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLInt,
  GraphQLInterfaceType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
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

  it("should auto assign alias for objects in operations with silk", () => {
    const User = silk(
      new GraphQLObjectType({
        name: AUTO_ALIASING,
        fields: {
          id: { type: new GraphQLNonNull(GraphQLString) },
          name: { type: new GraphQLNonNull(GraphQLString) },
          email: { type: new GraphQLNonNull(GraphQLString) },
          age: { type: new GraphQLNonNull(GraphQLInt) },
          role: { type: new GraphQLNonNull(GraphQLString) },
        },
      })
    )
    const CreateUserInput = silk(
      new GraphQLObjectType({
        name: AUTO_ALIASING,
        fields: {
          name: { type: new GraphQLNonNull(GraphQLString) },
          email: { type: new GraphQLNonNull(GraphQLString) },
          age: { type: new GraphQLNonNull(GraphQLInt) },
          role: { type: new GraphQLNonNull(GraphQLString) },
        },
      })
    )
    const userResolver = resolver.of(User, {
      users: query(silk.list(User)).resolve(() => []),

      user: query(silk.nullable(User))
        .input({ id: silk(GraphQLString) })
        .resolve(({ id }) => null),

      createUser: mutation(User)
        .input({ input: CreateUserInput })
        .resolve(({ input }) => {
          return {
            id: "1",
            name: input.name,
            email: input.email,
            age: input.age,
            role: input.role ?? "USER",
          }
        }),
    })
    const schema = weave(userResolver)
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type User {
        id: String!
        name: String!
        email: String!
        age: Int!
        role: String!
      }

      type Query {
        users: [User]!
        user(id: String): User
      }

      type Mutation {
        createUser(input: CreateUserInputInput): User
      }

      input CreateUserInputInput {
        name: String!
        email: String!
        age: Int!
        role: String!
      }"
    `)
  })

  it("should auto assign alias for objects independently", () => {
    const Bar = new GraphQLObjectType({
      name: AUTO_ALIASING,
      fields: {
        hello: { type: GraphQLString },
      },
    })

    const schema = weave(silk(Bar))
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type Object1 {
        hello: String
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

  it("should auto assign alias for enums independently", () => {
    const Fruit = new GraphQLEnumType({
      name: AUTO_ALIASING,
      values: {
        apple: { value: "apple" },
        banana: { value: "banana" },
        orange: { value: "orange" },
      },
    })

    const schema = weave(silk(Fruit))
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "enum Enum1 {
        apple
        banana
        orange
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

      union Animal = AnimalItem1 | AnimalItem2

      type AnimalItem1 {
        name: String
        loveBone: Boolean
      }

      type AnimalItem2 {
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

      union Animal = AnimalItem1 | AnimalItem2

      type AnimalItem1 {
        name: String
        loveBone: Boolean
      }

      type AnimalItem2 {
        name: String
        loveFish: Boolean
      }

      type Foo {
        animal: Animal
      }"
    `)
  })

  it("should auto assign alias for unions independently", () => {
    const Dog = new GraphQLObjectType({
      name: AUTO_ALIASING,
      fields: {
        name: { type: GraphQLString },
        loveBone: { type: GraphQLBoolean },
      },
    })

    const Animal = new GraphQLUnionType({
      name: AUTO_ALIASING,
      types: [Dog],
    })

    const schema = weave(silk(Animal))
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "union Union1 = Object1

      type Object1 {
        name: String
        loveBone: Boolean
      }"
    `)
  })

  it("should auto assign alias for interface", () => {
    const Bar = new GraphQLInterfaceType({
      name: AUTO_ALIASING,
      fields: {
        name: { type: GraphQLString },
      },
    })

    const schema = weave(silk(Bar))
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "interface Interface1 {
        name: String
      }"
    `)
  })

  it("should auto assign alias for scalars", () => {
    const Foo = new GraphQLScalarType({
      name: AUTO_ALIASING,
    })

    const schema = weave(silk(Foo))
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "scalar Scalar1"
    `)
  })

  it("should auto assign alias for nested objects", () => {
    const SubDemoType = new GraphQLObjectType({
      name: AUTO_ALIASING,
      fields: {
        bar: { type: GraphQLString },
      },
    })

    const DemoType = new GraphQLObjectType({
      name: AUTO_ALIASING,
      fields: {
        foo: { type: GraphQLInt },
        sub: { type: SubDemoType },
      },
    })

    const Demo = silk(DemoType)

    const testResolver = resolver.of(Demo, {
      demo: query(Demo).resolve(() => ({
        foo: 42,
        sub: {
          bar: "Hello, World!",
        },
      })),
    })

    const schema = weave(testResolver)
    const schemaString = printSchema(schema)
    expect(schemaString).toMatchInlineSnapshot(`
      "type Demo {
        foo: Int
        sub: DemoSub
      }

      type DemoSub {
        bar: String
      }

      type Query {
        demo: Demo
      }"
    `)
  })

  it("should auto assign alias for circular references", () => {
    interface IFoo {
      bar?: IBar
    }
    interface IBar {
      foo?: IFoo
    }
    const Foo: GraphQLObjectType<IFoo> = new GraphQLObjectType({
      name: AUTO_ALIASING,
      fields: () => ({
        bar: { type: Bar },
      }),
    })
    const Bar: GraphQLObjectType<IBar> = new GraphQLObjectType({
      name: AUTO_ALIASING,
      fields: () => ({
        foo: { type: Foo },
      }),
    })

    const r1 = resolver({
      foo: query(silk(Foo)).resolve(() => ({})),
    })

    const r2 = resolver({
      bar: query(silk(Bar)).resolve(() => ({})),
    })

    expect(printSchema(weave(r1))).toMatchInlineSnapshot(`
      "type Query {
        foo: Foo
      }

      type Foo {
        bar: FooBar
      }

      type FooBar {
        foo: Foo
      }"
    `)

    expect(printSchema(weave(r2))).toMatchInlineSnapshot(`
      "type Query {
        bar: Bar
      }

      type Bar {
        foo: BarFoo
      }

      type BarFoo {
        bar: Bar
      }"
    `)
  })
})
