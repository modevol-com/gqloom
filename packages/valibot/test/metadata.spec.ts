import { collectNames, query, resolver, weave } from "@gqloom/core"
import { printSchema } from "graphql"
import * as v from "valibot"
import { describe, expect, it } from "vitest"
import {
  asEnumType,
  asObjectType,
  ValibotMetadataCollector,
  ValibotWeaver,
} from "../src"

describe("asObjectType", () => {
  it("should return asObjectType", () => {
    const result = asObjectType({})
    expect(result).toMatchObject({
      type: "gqloom.asObjectType",
    })
  })

  it("should get GraphQL Object type config", () => {
    const o = v.pipe(
      v.object({
        id: v.string(),
        name: v.string(),
      }),
      asObjectType({
        name: "User",
        extensions: { some: "value" },
      })
    )

    expect(ValibotMetadataCollector.getObjectConfig(o)).toMatchObject({
      name: "User",
      extensions: { some: "value" },
    })
  })

  it("should use v.title() as object type name", () => {
    const User = v.pipe(
      v.object({
        id: v.string(),
        name: v.string(),
      }),
      v.title("User")
    )

    collectNames({ User })
    const r = resolver.of(User, {})
    const schema = weave(r, ValibotWeaver)
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type User {
        id: String!
        name: String!
      }"
    `)
  })

  it("should use v.metadata() title as object type name", () => {
    const Product = v.pipe(
      v.object({
        id: v.string(),
        price: v.number(),
      }),
      v.metadata({ title: "Product", description: "A product in the catalog" })
    )

    collectNames({ Product })
    const r = resolver.of(Product, {})
    const schema = weave(r, ValibotWeaver)
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      """"A product in the catalog"""
      type Product {
        id: String!
        price: Float!
      }"
    `)
  })
})

describe("asEnumType", () => {
  it("should return asEnumType", () => {
    const result = asEnumType({})
    expect(result).toMatchObject({
      type: "gqloom.asEnumType",
    })
  })

  it("should get enum config", () => {
    const DiscussType = v.pipe(
      v.picklist(["question", "answer"]),
      asEnumType({ description: "discuss type" })
    )

    const config = ValibotMetadataCollector.getEnumConfig(DiscussType)
    expect(config).toMatchObject({ description: "discuss type" })

    const object = v.object({
      t1: DiscussType,
      t2: v.pipe(v.nonNullish(DiscussType), v.description("t2 description")),
      t3: v.pipe(DiscussType, v.description("t3 description")),
    })
    collectNames({ DiscussType, object })
    const r = resolver.of(object, {})
    const schema = weave(r, ValibotWeaver)
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type object {
        t1: DiscussType!

        """t2 description"""
        t2: DiscussType!

        """t3 description"""
        t3: DiscussType!
      }

      """discuss type"""
      enum DiscussType {
        question
        answer
      }"
    `)
  })

  it("should use v.title() as enum type name", () => {
    const Status = v.pipe(v.picklist(["active", "inactive"]), v.title("Status"))

    const User = v.object({ status: Status })
    collectNames({ Status, User })
    const r = resolver.of(User, {})
    const schema = weave(r, ValibotWeaver)
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type User {
        status: Status!
      }

      enum Status {
        active
        inactive
      }"
    `)
  })

  it("should use v.metadata() title as enum type name with description", () => {
    const Priority = v.pipe(
      v.picklist(["low", "medium", "high"]),
      v.metadata({ title: "Priority", description: "Task priority level" })
    )

    const Task = v.object({ priority: Priority })
    collectNames({ Priority, Task })
    const r = resolver.of(Task, {})
    const schema = weave(r, ValibotWeaver)
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type Task {
        """Task priority level"""
        priority: Priority!
      }

      """Task priority level"""
      enum Priority {
        low
        medium
        high
      }"
    `)
  })
})

describe("asUnionType", () => {
  it("should use v.title() as union type name", () => {
    const Cat = v.object({
      __typename: v.literal("Cat"),
      name: v.string(),
      meow: v.boolean(),
    })
    const Dog = v.object({
      __typename: v.literal("Dog"),
      name: v.string(),
      bark: v.boolean(),
    })

    const Animal = v.pipe(
      v.variant("__typename", [Cat, Dog]),
      v.title("Animal")
    )

    collectNames({ Animal, Cat, Dog })
    const r = resolver({
      animal: query(Animal, () => ({
        __typename: "Cat" as const,
        name: "Whiskers",
        meow: true,
      })),
    })
    const schema = weave(r, ValibotWeaver)
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type Query {
        animal: Animal!
      }

      union Animal = Cat | Dog

      type Cat {
        name: String!
        meow: Boolean!
      }

      type Dog {
        name: String!
        bark: Boolean!
      }"
    `)
  })

  it("should use v.metadata() title as union type name with description", () => {
    const Success = v.object({
      __typename: v.literal("Success"),
      data: v.string(),
    })
    const Failure = v.object({
      __typename: v.literal("Failure"),
      message: v.string(),
    })

    const Result = v.pipe(
      v.variant("__typename", [Success, Failure]),
      v.metadata({
        title: "Result",
        description: "Operation result can be success or failure",
      })
    )

    collectNames({ Result, Success, Failure })
    const r = resolver({
      result: query(Result, () => ({
        __typename: "Success" as const,
        data: "ok",
      })),
    })
    const schema = weave(r, ValibotWeaver)
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type Query {
        result: Result!
      }

      """Operation result can be success or failure"""
      union Result = Success | Failure

      type Success {
        data: String!
      }

      type Failure {
        message: String!
      }"
    `)
  })
})

describe("ValibotMetadataCollector", () => {
  it("should get description", () => {
    const name = v.pipe(v.string(), v.description("some description"))

    let config

    config = ValibotMetadataCollector.getFieldConfig(name)
    expect(config).toMatchObject({ description: "some description" })

    const name2 = v.pipe(name, v.description("another description"))
    config = ValibotMetadataCollector.getFieldConfig(name2)
    expect(config).toMatchObject({ description: "another description" })

    const name3 = v.nullish(name)
    config = ValibotMetadataCollector.getFieldConfig(name3)
    expect(config).toMatchObject({ description: "some description" })

    const name4 = v.nonNullish(name)
    config = ValibotMetadataCollector.getFieldConfig(name4)
    expect(config).toMatchObject({ description: "some description" })

    const User = v.object({
      name: v.pipe(v.string(), v.description("The name of the user")),
      email: v.pipe(v.string(), v.description("The email of the user")),
      age: v.optional(v.pipe(v.number(), v.description("The age of the user"))),
    })
    collectNames({ User })
    const r = resolver.of(User, {})
    const schema = weave(r, ValibotWeaver)
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type User {
        """The name of the user"""
        name: String!

        """The email of the user"""
        email: String!

        """The age of the user"""
        age: Float
      }"
    `)
  })

  it("should prefer v.description() over v.metadata() description", () => {
    const name = v.pipe(
      v.string(),
      v.metadata({ description: "from metadata" }),
      v.description("from description")
    )

    const config = ValibotMetadataCollector.getFieldConfig(name)
    expect(config).toMatchObject({
      description: "from description",
    })
  })

  it("should use v.metadata() description when v.description() not present", () => {
    const name = v.pipe(
      v.string(),
      v.metadata({ description: "from metadata" })
    )

    const config = ValibotMetadataCollector.getFieldConfig(name)
    expect(config).toMatchObject({
      description: "from metadata",
    })
  })

  it("should use v.title() as type name with v.metadata() description", () => {
    const Person = v.pipe(
      v.object({
        name: v.string(),
        age: v.number(),
      }),
      v.title("Person"),
      v.metadata({ description: "A human person" })
    )

    collectNames({ Person })
    const r = resolver.of(Person, {})
    const schema = weave(r, ValibotWeaver)
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      """"A human person"""
      type Person {
        name: String!
        age: Float!
      }"
    `)
  })

  it("should silently ignore non-string metadata.title for type name", () => {
    const Product = v.pipe(
      v.object({
        id: v.string(),
        name: v.string(),
      }),
      v.metadata({ title: 123 as unknown as string }),
      v.title("Product")
    )

    collectNames({ Product })
    const r = resolver.of(Product, {})
    const schema = weave(r, ValibotWeaver)
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type Product {
        id: String!
        name: String!
      }"
    `)
  })

  it("should silently ignore non-string metadata.description", () => {
    const name = v.pipe(
      v.string(),
      v.metadata({ description: 123 as unknown as string })
    )

    const config = ValibotMetadataCollector.getFieldConfig(name)
    // When metadata.description is not a string, no description is set
    expect(config).toEqual({ description: undefined })
  })

  it("should handle mixed valid and invalid metadata values", () => {
    const Item = v.pipe(
      v.object({
        id: v.string(),
      }),
      v.metadata({
        title: 123 as unknown as string,
        description: 456 as unknown as string,
      }),
      v.title("Item")
    )

    collectNames({ Item })
    const r = resolver.of(Item, {})
    const schema = weave(r, ValibotWeaver)
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type Item {
        id: String!
      }"
    `)
  })

  it("should use string metadata.title when valid", () => {
    const Category = v.pipe(
      v.object({
        id: v.string(),
      }),
      v.metadata({ title: "Category" })
    )

    collectNames({ Category })
    const r = resolver.of(Category, {})
    const schema = weave(r, ValibotWeaver)
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type Category {
        id: String!
      }"
    `)
  })
})
