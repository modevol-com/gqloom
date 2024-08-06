import { silk } from "@gqloom/core"
import {
  manyToMany,
  weaveEntitySchemaBySilk,
  manyToOne,
  oneToMany,
  type GraphQLSilkEntity,
} from "../src/entity-schema"
import { GraphQLID, GraphQLObjectType, GraphQLString } from "graphql"
import {
  type Collection,
  MikroORM,
  type Reference,
  type EntitySchema,
  type Ref,
} from "@mikro-orm/core"
import { describe, expectTypeOf, it } from "vitest"
import { type InferEntityData } from "../src"

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
  weaveEntitySchemaBySilk.withRelations(Book, {
    author: manyToOne(() => AuthorEntity),
  })

interface IAuthorEntity extends GraphQLSilkEntity<typeof Author> {
  books: Collection<IBookEntity>
}

const AuthorEntity: EntitySchema<IAuthorEntity> =
  weaveEntitySchemaBySilk.withRelations(Author, {
    books: oneToMany(() => BookEntity, { mappedBy: "author" }),
  })

interface IGiraffeEntity extends GraphQLSilkEntity<typeof Giraffe> {
  friends: Collection<IGiraffeEntity>
}

const GiraffeEntity: EntitySchema<IGiraffeEntity> =
  weaveEntitySchemaBySilk.withRelations(Giraffe, {
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

  it("should infer nullable relations", async () => {
    const Keeper = silk<{ id: number; name: string }>(
      new GraphQLObjectType({
        name: "Giraffe",
        fields: {
          id: { type: GraphQLString },
          name: { type: GraphQLID },
        },
      })
    )

    const KeeperEntity = weaveEntitySchemaBySilk(Keeper)

    const Tree = silk<{ id: number; location: string }>(
      new GraphQLObjectType({
        name: "Tree",
        fields: {
          id: { type: GraphQLID },
          location: { type: GraphQLString },
        },
      })
    )

    const TreeEntity = weaveEntitySchemaBySilk(Tree)

    const Ailurus = silk<{ id: number; name: string }>(
      new GraphQLObjectType({
        name: "Ailurus",
        fields: {
          id: { type: GraphQLID },
          name: { type: GraphQLString },
        },
      })
    )

    const AilurusEntity = weaveEntitySchemaBySilk.withRelations(Ailurus, {
      keeper: manyToOne(() => KeeperEntity, { nullable: true }),
      trees: manyToMany(() => TreeEntity, {
        owner: true,
        nullable: true,
      }),
    })

    type IKeeper = InferEntityData<typeof KeeperEntity>
    type ITree = InferEntityData<typeof TreeEntity>
    type IAilurus = InferEntityData<typeof AilurusEntity>

    expectTypeOf<IKeeper>().toMatchTypeOf<{ id: number; name: string }>()
    expectTypeOf<ITree>().toMatchTypeOf<{ id: number; location: string }>()
    expectTypeOf<IAilurus>().toMatchTypeOf<{
      id: number
      name: string
      keeper?: Reference<IKeeper> | null
      trees: Collection<ITree>
    }>()
    const orm = await MikroORM.init()
    const em = orm.em.fork()
    const ailurus = em.create(AilurusEntity, { name: "name" })
    expectTypeOf(ailurus).toMatchTypeOf<IAilurus>()
  })
})
