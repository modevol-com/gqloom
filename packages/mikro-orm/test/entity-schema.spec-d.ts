import { silk } from "@gqloom/core"
import { type Collection, MikroORM, type Reference } from "@mikro-orm/core"
import { GraphQLID, GraphQLObjectType, GraphQLString } from "graphql"
import { describe, expectTypeOf, it } from "vitest"
import type { EntitySilk, InferEntity } from "../src"
import {
  type GraphQLSilkEntity,
  manyToMany,
  manyToOne,
  oneToMany,
  oneToOne,
  weaveEntitySchemaBySilk,
} from "../src/entity-schema"

const Book = silk(
  new GraphQLObjectType<{ title?: string }>({
    name: "Book",
    fields: {
      title: { type: GraphQLString },
    },
  })
)

const Author = silk(
  new GraphQLObjectType<{ name: string; age?: number }>({
    name: "Author",
    fields: {
      name: { type: GraphQLString },
    },
  })
)

const Article = silk<{ title: string }>(
  new GraphQLObjectType({
    name: "Article",
    fields: {
      title: { type: GraphQLString },
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
  author: Reference<IAuthorEntity>
}

const BookEntity: EntitySilk<IBookEntity> =
  weaveEntitySchemaBySilk.withRelations(Book, {
    author: manyToOne(() => AuthorEntity),
  })

interface IAuthorEntity extends GraphQLSilkEntity<typeof Author> {
  books: Collection<IBookEntity>
}

const AuthorEntity: EntitySilk<IAuthorEntity> =
  weaveEntitySchemaBySilk.withRelations(Author, {
    books: oneToMany(() => BookEntity, { mappedBy: "author" }),
  })

const Label = silk(
  new GraphQLObjectType<{ name: string }>({
    name: "Label",
    fields: { name: { type: GraphQLString } },
  })
)

const LabelEntity = weaveEntitySchemaBySilk(Label)

type ILabelEntity = InferEntity<typeof LabelEntity>

interface IArticleEntity extends GraphQLSilkEntity<typeof Article> {
  author: Reference<IAuthorEntity> | null
  label: Reference<ILabelEntity> | null
}

const ArticleEntity = weaveEntitySchemaBySilk.withRelations(
  Article,
  {
    author: manyToOne(() => AuthorEntity, { nullable: true }),
    label: oneToOne(() => LabelEntity, { nullable: true }),
  },
  {
    name: "Article",
    indexes: [{ properties: ["author"] }, { properties: ["title"] }],
  }
)

interface IGiraffeEntity extends GraphQLSilkEntity<typeof Giraffe> {
  friends: Collection<IGiraffeEntity>
}

const GiraffeEntity: EntitySilk<IGiraffeEntity> =
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
    const article = em.create(ArticleEntity, { title: "title" })
    const giraffe = em.create(GiraffeEntity, { name: "name" })
    expectTypeOf(article).toMatchTypeOf<IArticleEntity>()
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

    type IKeeper = InferEntity<typeof KeeperEntity>
    type ITree = InferEntity<typeof TreeEntity>
    type IAilurus = InferEntity<typeof AilurusEntity>

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
