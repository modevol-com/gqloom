import "reflect-metadata"
import {
  getGraphQLType,
  initWeaverContext,
  provideWeaverContext,
  query,
  resolver,
  weave,
} from "@gqloom/core"
import {
  Collection,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
} from "@mikro-orm/core"
import { defineConfig, MikroORM } from "@mikro-orm/libsql"
import {
  GraphQLNonNull,
  type GraphQLOutputType,
  printSchema,
  printType,
} from "graphql"
import { beforeAll, describe, expect, it } from "vitest"
import { MikroResolverFactory, MikroWeaver, mikroSilk } from "../src"

// --- Decorator-based entities (class + @Entity) ---

@Entity({ tableName: "decorator_authors" })
export class DecoratorAuthor {
  @PrimaryKey({ type: "number", autoincrement: true })
  public id!: number

  @Property({ type: "string" })
  public name!: string

  @Property({ type: "string" })
  public email!: string

  @OneToMany(
    () => DecoratorBook,
    (book) => book.author
  )
  public books = new Collection<DecoratorBook>(this)
}

@Entity({ tableName: "decorator_books" })
export class DecoratorBook {
  @PrimaryKey({ type: "number", autoincrement: true })
  public id!: number

  @Property({ type: "string" })
  public title!: string

  @ManyToOne(() => DecoratorAuthor, { ref: true })
  public author!: DecoratorAuthor
}

describe("decorators + class entities (GraphQL schema)", () => {
  let orm: MikroORM

  beforeAll(async () => {
    orm = await MikroORM.init(
      defineConfig({
        entities: [DecoratorAuthor, DecoratorBook],
        dbName: ":memory:",
        allowGlobalContext: true,
      })
    )
    await orm.getSchemaGenerator().createSchema()
  })

  it("should weave GraphQL types from class entities with MikroWeaver.config(metadata)", () => {
    const AuthorSilk = mikroSilk(DecoratorAuthor)
    const BookSilk = mikroSilk(DecoratorBook)

    const schema = weave(
      MikroWeaver.config({
        metadata: orm.getMetadata(),
      }),
      resolver({
        author: query(AuthorSilk, () => null as any),
        book: query(BookSilk, () => null as any),
      })
    )

    const authorType = schema.getType("DecoratorAuthor")
    const bookType = schema.getType("DecoratorBook")

    expect(authorType).toBeDefined()
    expect(bookType).toBeDefined()
    expect(printType(authorType!)).toMatchInlineSnapshot(`
      "type DecoratorAuthor {
        id: ID!
        name: String!
        email: String!
      }"
    `)
    expect(printType(bookType!)).toMatchInlineSnapshot(`
      "type DecoratorBook {
        id: ID!
        title: String!
      }"
    `)
  })

  it("should resolve getGraphQLType for class entity when metadata is in weaver config", () => {
    const weaverConfig = MikroWeaver.config({
      metadata: orm.getMetadata(),
    })

    const AuthorSilk = mikroSilk(DecoratorAuthor)

    const ctx = initWeaverContext()
    ctx.setConfig(weaverConfig)

    const authorType = provideWeaverContext(
      () => getGraphQLType(AuthorSilk),
      ctx
    )
    expect(authorType).toBeDefined()
    const unwrapped =
      authorType instanceof GraphQLNonNull
        ? (authorType as GraphQLNonNull<GraphQLOutputType>).ofType
        : authorType
    const printed = printType(unwrapped as any)
    expect(printed).toContain("DecoratorAuthor")
    expect(printed).toContain("id: ID!")
    expect(printed).toContain("name: String!")
    expect(printed).toContain("email: String!")
  })

  it("should build full schema with resolver factory (queries + relations)", () => {
    const weaverConfig = MikroWeaver.config({
      metadata: orm.getMetadata(),
    })

    const authorFactory = new MikroResolverFactory(
      DecoratorAuthor,
      () => orm.em
    )
    const bookFactory = new MikroResolverFactory(DecoratorBook, () => orm.em)

    const ctx = initWeaverContext()
    ctx.setConfig(weaverConfig)

    const schema = provideWeaverContext(() => {
      const authorResolver = authorFactory.queriesResolver("DecoratorAuthor")
      const bookResolver = bookFactory.queriesResolver("DecoratorBook")
      return weave(weaverConfig, authorResolver, bookResolver)
    }, ctx)

    expect(printSchema(schema)).toContain("type DecoratorAuthor")
    expect(printSchema(schema)).toContain("type DecoratorBook")
    expect(printSchema(schema)).toContain("countDecoratorAuthor")
    expect(printSchema(schema)).toContain("findDecoratorAuthor")
    expect(printSchema(schema)).toContain("findOneDecoratorAuthor")
    expect(printSchema(schema)).toContain("countDecoratorBook")
    expect(printSchema(schema)).toContain("findDecoratorBook")
    // Relation fields on types
    expect(printSchema(schema)).toContain("books")
    expect(printSchema(schema)).toContain("author")
  })

  it("should support getter form metadata in weaver config (ValueOrGetter)", () => {
    const weaverConfig = MikroWeaver.config({
      metadata: () => orm.getMetadata(),
    })

    const AuthorSilk = mikroSilk(DecoratorAuthor)

    const schema = weave(
      weaverConfig,
      resolver({
        author: query(AuthorSilk, () => null as any),
      })
    )

    const authorType = schema.getType("DecoratorAuthor")
    expect(authorType).toBeDefined()
    expect(printType(authorType!)).toContain("id: ID!")
  })
})
