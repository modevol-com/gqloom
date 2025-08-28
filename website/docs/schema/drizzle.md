# Drizzle
<script setup lang="ts">
import { Tabs, Tab } from '@/components/tabs'
</script>

[Drizzle](https://orm.drizzle.team/) is a modern, type-safe TypeScript ORM designed for Node.js. It offers a concise and easy-to-use API, supports databases such as PostgreSQL, MySQL, and SQLite, and has powerful query builders, transaction processing, and database migration capabilities. At the same time, it remains lightweight and has no external dependencies, making it very suitable for database operation scenarios that require high performance and type safety.

`@gqloom/drizzle` provides the integration of GQLoom and Drizzle:

- Use Drizzle Table as [Silk](../silk);
- Use the resolver factory to quickly create CRUD operations from Drizzle.

## Installation

<Tabs groupId="drizzle-api-version">
<Tab title="Relational API v2">

Please refer to Drizzle's [Getting Started Guide](https://rqbv2.drizzle-orm-fe.pages.dev/docs/get-started) to install Drizzle and its corresponding database integration.

After installing Drizzle, install `@gqloom/drizzle`:

::: code-group
```sh [npm]
npm i @gqloom/core @drizzle-orm@beta @gqloom/drizzle@beta
```
```sh [pnpm]
pnpm add @gqloom/core @drizzle-orm@beta @gqloom/drizzle@beta
```
```sh [yarn]
yarn add @gqloom/core @drizzle-orm@beta @gqloom/drizzle@beta
```
```sh [bun]
bun add @gqloom/core @drizzle-orm@beta @gqloom/drizzle@beta
```
:::

</Tab>
<Tab title="Relational API v1">

Please refer to Drizzle's [Getting Started Guide](https://rqbv2.drizzle-orm-fe.pages.dev/docs/get-started) to install Drizzle and its corresponding database integration.

After installing Drizzle, install `@gqloom/drizzle`:

::: code-group
```sh [npm]
npm i @gqloom/core @gqloom/drizzle
```
```sh [pnpm]
pnpm add @gqloom/core @gqloom/drizzle
```
```sh [yarn]
yarn add @gqloom/core @gqloom/drizzle
```
```sh [bun]
bun add @gqloom/core @gqloom/drizzle
```
:::

</Tab>
</Tabs>

## Using Silk

We can easily use Drizzle Schemas as [Silk](../silk) by simply wrapping them with `drizzleSilk`.

```ts twoslash title="schema.ts"
import { drizzleSilk } from "@gqloom/drizzle"
import { relations } from "drizzle-orm"
import * as t from "drizzle-orm/sqlite-core"

export const users = drizzleSilk(
  t.sqliteTable("users", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    age: t.int(),
    email: t.text(),
    password: t.text(),
  })
)

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}))

export const posts = drizzleSilk(
  t.sqliteTable("posts", {
    id: t.int().primaryKey({ autoIncrement: true }),
    title: t.text().notNull(),
    content: t.text(),
    authorId: t.int().references(() => users.id, { onDelete: "cascade" }),
  })
)

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}))
```

Let's use them in the resolver. At the same time, we use the `useSelectedColumns()` function to know which columns are needed for the current GraphQL query: 

```ts twoslash title="resolver.ts"
// @filename: schema.ts
import { drizzleSilk } from "@gqloom/drizzle"
import { relations } from "drizzle-orm"
import * as t from "drizzle-orm/sqlite-core"

export const users = drizzleSilk(
  t.sqliteTable("users", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    age: t.int(),
    email: t.text(),
    password: t.text(),
  })
)

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}))

export const posts = drizzleSilk(
  t.sqliteTable("posts", {
    id: t.int().primaryKey({ autoIncrement: true }),
    title: t.text().notNull(),
    content: t.text(),
    authorId: t.int().references(() => users.id, { onDelete: "cascade" }),
  })
)

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}))
// @filename: resolver.ts
// ---cut---
import { field, query, resolver } from "@gqloom/core"
import { useSelectedColumns } from "@gqloom/drizzle/context"
import { eq, inArray } from "drizzle-orm"
import { drizzle } from "drizzle-orm/libsql"
import * as v from "valibot"
import * as schema from "./schema"
import { posts, users } from "./schema"

const db = drizzle({
  schema,
  connection: { url: process.env.DB_FILE_NAME! },
})

export const usersResolver = resolver.of(users, {
  user: query
    .output(users.$nullable())
    .input({ id: v.number() })
    .resolve(({ id }) => {
      return db
        .select(useSelectedColumns(users))
        .from(users)
        .where(eq(users.id, id))
        .get()
    }),

  users: query.output(users.$list()).resolve(() => {
    return db.select(useSelectedColumns(users)).from(users).all()
  }),

  posts: field
    .output(posts.$list())
    .derivedFrom("id")
    .load(async (userList) => {
      const postList = await db
        .select()
        .from(posts)
        .where(
          inArray(
            users.id,
            userList.map((user) => user.id)
          )
        )
      const groups = new Map<number, (typeof posts.$inferSelect)[]>()

      for (const post of postList) {
        const key = post.authorId
        if (key == null) continue
        groups.set(key, [...(groups.get(key) ?? []), post])
      }
      return userList.map((user) => groups.get(user.id) ?? [])
    }),
})
```

As shown in the code above, we can directly use the Drizzle Table wrapped by `drizzleSilk` in the `resolver`. 
Here, we use `users` as the parent type of `resolver.of`, and define two queries named `user` and `users` and a field named `posts` in the resolver. Among them:
- The return type of `user` is `users.$nullable()`, indicating that `user` may be null;
- The return type of `users` is `users.$list()`, indicating that `users` will return a list of `users`;
- The return type of the `posts` field is `posts.$list()`. In the `posts` field, we use the `userList` parameter in the `load` method. TypeScript will help us infer its type. The `load` method is a wrapper of `DataLoader`, allowing us to quickly define a `DataLoader` method and use it to batch fetch `posts`. 

We also use the `useSelectedColumns()` function to determine which columns need to be selected for the current GraphQL query. This function requires [enabling context](../context).  
For runtimes where the `useSelectedColumns()` function cannot be used, we can also use the `getSelectedColumns()` function to obtain the columns that need to be selected for the current query.

### Derived Fields

Adding derived Fields to a database table is quite simple. However, it's important to use the `field().derivedFrom()` method to declare the columns on which the computed property depends, so that the `useSelectedColumns` method can correctly select these columns: 

```ts twoslash title="schema.ts"
// @filename: schema.ts
import { drizzleSilk } from "@gqloom/drizzle"
import * as t from "drizzle-orm/sqlite-core"

export const posts = drizzleSilk(
  t.sqliteTable("posts", {
    id: t.int().primaryKey({ autoIncrement: true }),
    title: t.text().notNull(),
    content: t.text(),
    authorId: t.int(),
  })
)
// @filename: resolver.ts
// ---cut---
import { field, resolver } from "@gqloom/core"
import * as v from "valibot"
import { posts } from "./schema"

export const postsResolver = resolver.of(posts, {
  abstract: field(v.string())
    .derivedFrom("title", "content")
    .resolve((post) => {
      return `${post.title} ${post.content?.slice(0, 60)}...`
    }),
})
```

### Hiding Fields

Sometimes we don't want to expose all fields of the database table to the client.
Consider that we have a `users` table containing a password field, where the `password` field is an encrypted password, and we don't want to expose it to the client:

```ts twoslash title="schema.ts"
import { drizzleSilk } from "@gqloom/drizzle"
import * as t from "drizzle-orm/sqlite-core"

export const users = drizzleSilk(
  t.sqliteTable("users", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    age: t.int(),
    email: t.text(),
    password: t.text(),
  })
)
```

We can use `field.hidden` in the resolver to hide the `password` field:

```ts twoslash title="resolver.ts"
// @filename: schema.ts
import { drizzleSilk } from "@gqloom/drizzle"
import * as t from "drizzle-orm/sqlite-core"

export const users = drizzleSilk(
  t.sqliteTable("users", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    age: t.int(),
    email: t.text(),
    password: t.text(),
  })
)
// @filename: resolver.ts
// ---cut---
import { field, resolver } from "@gqloom/core"
import { users } from "./schema"

export const usersResolver = resolver.of(users, {
  password: field.hidden,
})
```

## Resolver Factory

`gqloom/drizzle` provides a resolver factory `DrizzleResolverFactory` to easily create CRUD resolvers from Drizzle, and it also supports custom parameters and adding middleware.

<Tabs groupId="drizzle-api-version">
<Tab title="Relational API v2">

```ts [schema.ts]
import { drizzleResolverFactory } from "@gqloom/drizzle"
import { drizzle } from "drizzle-orm/libsql"
import { users } from "./schema"

const db = drizzle({
  connection: { url: process.env.DB_FILE_NAME! },
})

const usersResolverFactory = drizzleResolverFactory(db, users)
```

</Tab>
<Tab title="Relational API v1">

```ts twoslash [schema.ts]
// @filename: schema.ts
import { drizzleSilk } from "@gqloom/drizzle"
import { relations } from "drizzle-orm"
import * as t from "drizzle-orm/sqlite-core"

export const users = drizzleSilk(
  t.sqliteTable("users", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    age: t.int(),
    email: t.text(),
    password: t.text(),
  })
)

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}))

export const posts = drizzleSilk(
  t.sqliteTable("posts", {
    id: t.int().primaryKey({ autoIncrement: true }),
    title: t.text().notNull(),
    content: t.text(),
    authorId: t.int().references(() => users.id, { onDelete: "cascade" }),
  })
)

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}))
// @filename: resolver.ts
// ---cut---
import { drizzleResolverFactory } from "@gqloom/drizzle"
import { drizzle } from "drizzle-orm/libsql"
import * as schema from "./schema"
import { users } from "./schema"

const db = drizzle({
  schema,
  connection: { url: process.env.DB_FILE_NAME! },
})

const usersResolverFactory = drizzleResolverFactory(db, users)
```

</Tab>
</Tabs>

### Relationship Fields

In Drizzle Table, we can easily create [relationships](https://orm.drizzle.team/docs/relations). We can use the `relationField` method of the resolver factory to create corresponding GraphQL fields for relationships.

```ts twoslash [resolver.ts]
// @filename: schema.ts
import { drizzleSilk } from "@gqloom/drizzle"
import { relations } from "drizzle-orm"
import * as t from "drizzle-orm/sqlite-core"

export const users = drizzleSilk(
  t.sqliteTable("users", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    age: t.int(),
    email: t.text(),
    password: t.text(),
  })
)

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}))

export const posts = drizzleSilk(
  t.sqliteTable("posts", {
    id: t.int().primaryKey({ autoIncrement: true }),
    title: t.text().notNull(),
    content: t.text(),
    authorId: t.int().references(() => users.id, { onDelete: "cascade" }),
  })
)

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}))
// @filename: resolver.ts
import { field, EasyDataLoader } from "@gqloom/core"
import { createMemoization } from "@gqloom/core/context"
import { posts } from "schema"
// ---cut---
import { query, resolver } from "@gqloom/core"
import { drizzleResolverFactory } from "@gqloom/drizzle"
import { eq, inArray } from "drizzle-orm"
import { drizzle } from "drizzle-orm/libsql"
import * as v from "valibot"
import * as schema from "./schema"
import { users } from "./schema"

const db = drizzle({
  schema,
  connection: { url: process.env.DB_FILE_NAME! },
})

const usersResolverFactory = drizzleResolverFactory(db, users)

const usePostsLoader = createMemoization( // [!code --]
  () => // [!code --]
    new EasyDataLoader< // [!code --]
      { id: number }, // [!code --]
      (typeof posts.$inferSelect)[] // [!code --]
    >(async (userList) => { // [!code --]
      const postList = await db // [!code --]
        .select() // [!code --]
        .from(posts) // [!code --]
        .where( // [!code --]
          inArray( // [!code --]
            users.id, // [!code --]
            userList.map((user) => user.id) // [!code --]
          ) // [!code --]
        ) // [!code --]
      const groups = new Map<number, (typeof posts.$inferSelect)[]>() // [!code --]
      // [!code --]
      for (const post of postList) { // [!code --]
        const key = post.authorId // [!code --]
        if (key == null) continue // [!code --]
        groups.set(key, [...(groups.get(key) ?? []), post]) // [!code --]
      } // [!code --]
      return userList.map((user) => groups.get(user.id) ?? []) // [!code --]
    }) // [!code --]
) // [!code --]
 
export const usersResolver = resolver.of(users, {
  user: query
    .output(users.$nullable())
    .input({ id: v.number() })
    .resolve(({ id }) => {
      return db.select().from(users).where(eq(users.id, id)).get()
    }),

  users: query.output(users.$list()).resolve(() => {
    return db.select().from(users).all()
  }),

  posts_: field.output(posts.$list()) // [!code --]
    .derivedFrom('id') // [!code --]
    .resolve((user) => { // [!code --]
      return usePostsLoader().load(user) // [!code --]
    }), // [!code --]

  posts: usersResolverFactory.relationField("posts"), // [!code ++]
})
```

### Queries

The Drizzle resolver factory pre-defines some commonly used queries:

- `selectArrayQuery`: Find multiple records in the corresponding table according to the conditions.
- `selectSingleQuery`: Find a single record in the corresponding table according to the conditions.
- `countQuery`: Count the number of records in the corresponding table according to the conditions.

We can use the queries from the resolver factory in the resolver:

```ts twoslash
// @filename: schema.ts
import { drizzleSilk } from "@gqloom/drizzle"
import { relations } from "drizzle-orm"
import * as t from "drizzle-orm/sqlite-core"

export const users = drizzleSilk(
  t.sqliteTable("users", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    age: t.int(),
    email: t.text(),
    password: t.text(),
  })
)

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}))

export const posts = drizzleSilk(
  t.sqliteTable("posts", {
    id: t.int().primaryKey({ autoIncrement: true }),
    title: t.text().notNull(),
    content: t.text(),
    authorId: t.int().references(() => users.id, { onDelete: "cascade" }),
  })
)

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}))
// @filename: resolver.ts
import { query, resolver } from "@gqloom/core"
import { drizzleResolverFactory } from "@gqloom/drizzle"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/libsql"
import * as v from "valibot"
import * as schema from "./schema"
import { users } from "./schema"

const db = drizzle({
  schema,
  connection: { url: process.env.DB_FILE_NAME! },
})

const usersResolverFactory = drizzleResolverFactory(db, "users")
// ---cut---
export const usersResolver = resolver.of(users, {
  user_: query // [!code --]
    .output(users.$nullable()) // [!code --]
    .input({ id: v.number() }) // [!code --]
    .resolve(({ id }) => { // [!code --]
      return db.select().from(users).where(eq(users.id, id)).get() // [!code --]
    }), // [!code --]

  user: usersResolverFactory.selectSingleQuery(), // [!code ++]

  users_: query.output(users.$list()).resolve(() => { // [!code --]
    return db.select().from(users).all() // [!code --]
  }), // [!code --]

  users: usersResolverFactory.selectArrayQuery(), // [!code ++]

  posts: usersResolverFactory.relationField("posts"), 
})
```

### Mutations

The Drizzle resolver factory predefines some commonly used mutations:

- `insertArrayMutation`: Insert multiple records.
- `insertSingleMutation`: Insert a single record.
- `updateMutation`: Update records.
- `deleteMutation`: Delete records.

We can use the mutations from the resolver factory in the resolver:

```ts twoslash
// @filename: schema.ts
import { drizzleSilk } from "@gqloom/drizzle"
import { relations } from "drizzle-orm"
import * as t from "drizzle-orm/sqlite-core"

export const users = drizzleSilk(
  t.sqliteTable("users", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    age: t.int(),
    email: t.text(),
    password: t.text(),
  })
)

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}))

export const posts = drizzleSilk(
  t.sqliteTable("posts", {
    id: t.int().primaryKey({ autoIncrement: true }),
    title: t.text().notNull(),
    content: t.text(),
    authorId: t.int().references(() => users.id, { onDelete: "cascade" }),
  })
)

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}))
// @filename: resolver.ts
import { resolver } from "@gqloom/core"
import { drizzleResolverFactory } from "@gqloom/drizzle"
import { drizzle } from "drizzle-orm/libsql"
import * as v from "valibot"
import * as schema from "./schema"
import { users } from "./schema"

const db = drizzle({
  schema,
  connection: { url: process.env.DB_FILE_NAME! },
})

const usersResolverFactory = drizzleResolverFactory(db, "users")
// ---cut---
export const usersResolver = resolver.of(users, {
  user: usersResolverFactory.selectSingleQuery(),

  users: usersResolverFactory.selectArrayQuery(),

  createUser: usersResolverFactory.insertSingleMutation(), // [!code ++]

  createUsers: usersResolverFactory.insertArrayMutation(), // [!code ++]

  posts: usersResolverFactory.relationField("posts"),
})
```

### Custom Input

The pre-defined queries and mutations of the resolver factory support custom input. You can define the input type through the `input` option:

```ts twoslash
// @filename: schema.ts
import { drizzleSilk } from "@gqloom/drizzle"
import { relations } from "drizzle-orm"
import * as t from "drizzle-orm/sqlite-core"

export const users = drizzleSilk(
  t.sqliteTable("users", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    age: t.int(),
    email: t.text(),
    password: t.text(),
  })
)

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}))

export const posts = drizzleSilk(
  t.sqliteTable("posts", {
    id: t.int().primaryKey({ autoIncrement: true }),
    title: t.text().notNull(),
    content: t.text(),
    authorId: t.int().references(() => users.id, { onDelete: "cascade" }),
  })
)

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}))
// @filename: resolver.ts
import { query, resolver } from "@gqloom/core"
import { drizzleResolverFactory } from "@gqloom/drizzle"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/libsql"
import * as v from "valibot"
import * as schema from "./schema"
import { users } from "./schema"

const db = drizzle({
  schema,
  connection: { url: process.env.DB_FILE_NAME! },
})

const usersResolverFactory = drizzleResolverFactory(db, "users")
// ---cut---
export const usersResolver = resolver.of(users, {
  user: usersResolverFactory.selectSingleQuery().input(
    v.pipe( // [!code hl]
      v.object({ id: v.number() }), // [!code hl]
      v.transform(({ id }) => ({ where: eq(users.id, id) })) // [!code hl]
    ) // [!code hl]
  ),

  users: usersResolverFactory.selectArrayQuery(),

  posts: usersResolverFactory.relationField("posts"),
})
```

In the above code, we use `valibot` to define the input type. `v.object({ id: v.number() })` defines the type of the input object, and `v.transform(({ id }) => ({ where: eq(users.id, id) }))` converts the input parameters into Drizzle query parameters.

### Adding Middleware

The pre-defined queries, mutations, and fields of the resolver factory support adding middleware. You can define middleware through the `middlewares` option:

```ts twoslash
// @filename: schema.ts
import { drizzleSilk } from "@gqloom/drizzle"
import { relations } from "drizzle-orm"
import * as t from "drizzle-orm/sqlite-core"

export const users = drizzleSilk(
  t.sqliteTable("users", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    age: t.int(),
    email: t.text(),
    password: t.text(),
  })
)

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}))

export const posts = drizzleSilk(
  t.sqliteTable("posts", {
    id: t.int().primaryKey({ autoIncrement: true }),
    title: t.text().notNull(),
    content: t.text(),
    authorId: t.int().references(() => users.id, { onDelete: "cascade" }),
  })
)

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}))
// @filename: resolver.ts
import { query, field, resolver } from "@gqloom/core"
import { createMemoization } from "@gqloom/core/context"
import { drizzleResolverFactory } from "@gqloom/drizzle"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/libsql"
import { GraphQLError } from "graphql"
import * as v from "valibot"
import * as schema from "./schema"
import { users, posts } from "./schema"

const db = drizzle({
  schema,
  connection: { url: process.env.DB_FILE_NAME! },
})

const postsResolverFactory = drizzleResolverFactory(db, "posts")

const useAuthedUser = createMemoization( async ()=> ({
  id: 0,
  name: "",
}))

// ---cut---
const postResolver = resolver.of(posts, {
  createPost: postsResolverFactory.insertSingleMutation().use(async (next) => { // [!code hl]
    const user = await useAuthedUser() // [!code hl]
    if (user == null) throw new GraphQLError("Please login first") // [!code hl]
    return next() // [!code hl]
  }), // [!code hl]

  author: postsResolverFactory.relationField("author"),

  authorId: field.hidden,
})
```

In the above code, we use the `middlewares` option to define middleware. `async (next) => { ... }` defines a middleware. `useAuthedUser()` is a custom function used to get the currently logged-in user. If the user is not logged in, an error is thrown; otherwise, `next()` is called to continue execution.

### Complete Resolver

We can directly create a complete Resolver with the resolver factory:

```ts twoslash
// @filename: schema.ts
import { drizzleSilk } from "@gqloom/drizzle"
import { relations } from "drizzle-orm"
import * as t from "drizzle-orm/sqlite-core"

export const users = drizzleSilk(
  t.sqliteTable("users", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    age: t.int(),
    email: t.text(),
    password: t.text(),
  })
)

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}))

export const posts = drizzleSilk(
  t.sqliteTable("posts", {
    id: t.int().primaryKey({ autoIncrement: true }),
    title: t.text().notNull(),
    content: t.text(),
    authorId: t.int().references(() => users.id, { onDelete: "cascade" }),
  })
)

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}))
// @filename: resolver.ts
import { query, resolver } from "@gqloom/core"
import { drizzleResolverFactory } from "@gqloom/drizzle"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/libsql"
import * as v from "valibot"
import * as schema from "./schema"
import { users } from "./schema"

const db = drizzle({
  schema,
  connection: { url: process.env.DB_FILE_NAME! },
})

const usersResolverFactory = drizzleResolverFactory(db, "users")
// ---cut---
// Readonly Resolver
const usersQueriesResolver = usersResolverFactory.queriesResolver()

// Full Resolver
const usersResolver = usersResolverFactory.resolver()
```

There are two functions for creating Resolvers:

- `usersResolverFactory.queriesResolver()`: Creates a Resolver that only includes queries and relational fields.
- `usersResolverFactory.resolver()`: Creates a Resolver that includes all queries, mutations, and relational fields.

## Custom Type Mapping

To adapt to more Drizzle types, we can extend GQLoom to add more type mappings.

First, we use `DrizzleWeaver.config` to define the configuration of type mapping. Here we import `GraphQLDateTime` and `GraphQLJSONObject` from [graphql-scalars](https://the-guild.dev/graphql/scalars). When encountering `date` and `json` types, we map them to the corresponding GraphQL scalars.

```ts twoslash
import { GraphQLDateTime, GraphQLJSON } from "graphql-scalars"
import { DrizzleWeaver } from "@gqloom/drizzle"

const drizzleWeaverConfig = DrizzleWeaver.config({
  presetGraphQLType: (column) => {
    if (column.dataType === "date") {
      return GraphQLDateTime
    }
    if (column.dataType === "json") {
      return GraphQLJSON
    }
  },
})
```

Pass the configuration to the `weave` function when weaving the GraphQL Schema:

```ts
import { weave } from "@gqloom/core"

export const schema = weave(drizzleWeaverConfig, usersResolver, postsResolver)
```

## Default Type Mapping

The following table lists the default mapping relationships between Drizzle `dataType` and GraphQL types in GQLoom:

| Drizzle `dataType` | GraphQL Type     |
| ------------------ | ---------------- |
| boolean            | `GraphQLBoolean` |
| number             | `GraphQLFloat`   |
| json               | `GraphQLString`  |
| date               | `GraphQLString`  |
| bigint             | `GraphQLString`  |
| string             | `GraphQLString`  |
| buffer             | `GraphQLList`    |
| array              | `GraphQLList`    |