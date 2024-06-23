import { silk } from "@gqloom/core"
import {
  manyToMany,
  weaveEntitySchemaBySilk,
  manyToOne,
  oneToMany,
  type GraphQLSilkEntity,
} from "../src/entity-schema"
import { GraphQLObjectType, GraphQLString } from "graphql"
import {
  type Collection,
  MikroORM,
  type EntitySchema,
  type Ref,
} from "@mikro-orm/core"
import { describe, expectTypeOf, it } from "vitest"

const Book = silk<{ title: string }>(
  new GraphQLObjectType({
    name: "Book",
    fields: {
      title: { type: GraphQLString },
    },
  })
)

const Author = silk<
  { name: string; age: number },
  { name: string; age?: number }
>(
  new GraphQLObjectType({
    name: "Author",
    fields: {
      name: { type: GraphQLString },
    },
  })
)

const Giraffe = silk<
  { name: string; age: number },
  { name: string; age?: number }
>(
  new GraphQLObjectType({
    name: "Giraffe",
    fields: {
      name: { type: GraphQLString },
    },
  })
)

interface IBookEntity extends GraphQLSilkEntity<typeof Book> {
  author: Ref<IAuthorEntity>
}

const BookEntity: EntitySchema<IBookEntity> =
  weaveEntitySchemaBySilk.withRelationships(Book, {
    author: manyToOne(() => AuthorEntity),
  })

interface IAuthorEntity extends GraphQLSilkEntity<typeof Author> {
  books: Collection<IBookEntity>
}

const AuthorEntity: EntitySchema<IAuthorEntity> =
  weaveEntitySchemaBySilk.withRelationships(Author, {
    books: oneToMany(() => BookEntity, { mappedBy: "author" }),
  })

interface IGiraffeEntity extends GraphQLSilkEntity<typeof Giraffe> {
  friends: Collection<IGiraffeEntity>
}

const GiraffeEntity: EntitySchema<IGiraffeEntity> =
  weaveEntitySchemaBySilk.withRelationships(Giraffe, {
    friends: manyToMany(() => GiraffeEntity),
  })

describe("entity-schema", () => {
  it("should avoid circular reference", async () => {
    const orm = await MikroORM.init()
    const em = orm.em.fork()
    const book = em.create(BookEntity, { title: "", author: { name: "name" } })
    const author = em.create(AuthorEntity, {
      name: "name",
      books: [book],
    })
    const giraffe = em.create(GiraffeEntity, {
      name: "name",
    })
    expectTypeOf(book).toMatchTypeOf<IBookEntity>()
    expectTypeOf(author).toMatchTypeOf<IAuthorEntity>()
    expectTypeOf(giraffe).toMatchTypeOf<IGiraffeEntity>()
  })
})
