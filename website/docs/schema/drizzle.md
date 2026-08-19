# Drizzle
<script setup lang="ts">
import { Tabs } from '@/components/tabs'
</script>

[Drizzle](https://orm.drizzle.team/) is a modern, type-safe TypeScript ORM designed for Node.js. It offers a concise and easy-to-use API, supports databases such as PostgreSQL, MySQL, and SQLite, and has powerful query builders, transaction processing, and database migration capabilities. At the same time, it remains lightweight and has no external dependencies, making it very suitable for database operation scenarios that require high performance and type safety.

`@gqloom/drizzle` provides the integration of GQLoom and Drizzle:

- Use Drizzle Table as [Silk](../silk);
- Use the resolver factory to quickly create CRUD operations from Drizzle.

`@gqloom/drizzle` supports Drizzle Relational Query API v1 (`drizzle-orm` 0.x, `@gqloom/drizzle`) and v2 (`drizzle-orm` 1.0, `@gqloom/drizzle@rc`). Use the **Relational API v1 / v2** tabs to switch examples; they stay in sync across this page.

## Installation

<!--@include: ../../snippets/install-drizzle.md-->

## Using Silk

We can easily use Drizzle Schemas as [Silk](../silk) by simply wrapping them with `drizzleSilk`.

<Tabs groupId="drizzle-api-version">
<template #Relational_API_v2>

<!--@include: @/snippets/drizzle/v2-silk-schema.md-->

</template>
<template #Relational_API_v1>

<!--@include: @/snippets/drizzle/v1-silk-schema.md-->

</template>
</Tabs>

Let's use them in the resolver. At the same time, we use the `useSelectedColumns()` function to know which columns are needed for the current GraphQL query: 

<Tabs groupId="drizzle-api-version">
<template #Relational_API_v2>

<!--@include: @/snippets/drizzle/v2-silk-resolver.md-->

</template>
<template #Relational_API_v1>

<!--@include: @/snippets/drizzle/v1-silk-resolver.md-->

</template>
</Tabs>

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

### Mixing Fields

Sometimes we use `json`, `enum` columns in database tables, and we want to correctly infer the types in both TypeScript and GraphQL. We can use libraries like `valibot` or `zod` to define these fields:

<Tabs groupId="schema-library">
<template #Valibot>

<<< @/snippets/code/drizzle-valibot.ts{ts twoslash}

</template>
<template #Zod>

<<< @/snippets/code/drizzle-zod.ts{ts twoslash}

</template>
</Tabs>

## Resolver Factory

`gqloom/drizzle` provides a resolver factory `DrizzleResolverFactory` to easily create CRUD resolvers from Drizzle, and it also supports custom parameters and adding middleware.

<Tabs groupId="drizzle-api-version">
<template #Relational_API_v2>

<!--@include: @/snippets/drizzle/v2-factory-intro.md-->

</template>
<template #Relational_API_v1>

<!--@include: @/snippets/drizzle/v1-factory-intro.md-->

</template>
</Tabs>

### Relationship Fields

In Drizzle Table, we can easily create [relationships](https://orm.drizzle.team/docs/relations). We can use the `relationField` method of the resolver factory to create corresponding GraphQL fields for relationships.

<Tabs groupId="drizzle-api-version">
<template #Relational_API_v2>

<!--@include: @/snippets/drizzle/v2-relation-field.md-->

</template>
<template #Relational_API_v1>

<!--@include: @/snippets/drizzle/v1-relation-field.md-->

</template>
</Tabs>

### Queries

The Drizzle resolver factory pre-defines some commonly used queries:

- `selectArrayQuery`: Find multiple records in the corresponding table according to the conditions.
- `selectSingleQuery`: Find a single record in the corresponding table according to the conditions.
- `countQuery`: Count the number of records in the corresponding table according to the conditions.

The query and mutation factories below use the same GQLoom API on both Relational API versions. Schema and `db` setup follow the version selected in the tabs above.

We can use the queries from the resolver factory in the resolver:

```ts twoslash
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

export const posts = drizzleSilk(
  t.sqliteTable("posts", {
    id: t.int().primaryKey({ autoIncrement: true }),
    title: t.text().notNull(),
    content: t.text(),
    authorId: t.int().references(() => users.id, { onDelete: "cascade" }),
  })
)
// @filename: relations.ts
import { defineRelations } from "drizzle-orm"
import * as tables from "./schema"

export const relations = defineRelations(tables, (r) => ({
  users: {
    posts: r.many.posts({
      from: r.users.id,
      to: r.posts.authorId,
    }),
  },
  posts: {
    author: r.one.users({
      from: r.posts.authorId,
      to: r.users.id,
    }),
  },
}))
// @filename: resolver.ts
import { query, resolver } from "@gqloom/core"
import { drizzleResolverFactory } from "@gqloom/drizzle"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/libsql"
import * as v from "valibot"
import { relations } from "./relations"
import { users } from "./schema"

const db = drizzle({
  relations,
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

export const posts = drizzleSilk(
  t.sqliteTable("posts", {
    id: t.int().primaryKey({ autoIncrement: true }),
    title: t.text().notNull(),
    content: t.text(),
    authorId: t.int().references(() => users.id, { onDelete: "cascade" }),
  })
)
// @filename: relations.ts
import { defineRelations } from "drizzle-orm"
import * as tables from "./schema"

export const relations = defineRelations(tables, (r) => ({
  users: {
    posts: r.many.posts({
      from: r.users.id,
      to: r.posts.authorId,
    }),
  },
  posts: {
    author: r.one.users({
      from: r.posts.authorId,
      to: r.users.id,
    }),
  },
}))
// @filename: resolver.ts
import { resolver } from "@gqloom/core"
import { drizzleResolverFactory } from "@gqloom/drizzle"
import { drizzle } from "drizzle-orm/libsql"
import * as v from "valibot"
import { relations } from "./relations"
import { users } from "./schema"

const db = drizzle({
  relations,
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

export const posts = drizzleSilk(
  t.sqliteTable("posts", {
    id: t.int().primaryKey({ autoIncrement: true }),
    title: t.text().notNull(),
    content: t.text(),
    authorId: t.int().references(() => users.id, { onDelete: "cascade" }),
  })
)
// @filename: relations.ts
import { defineRelations } from "drizzle-orm"
import * as tables from "./schema"

export const relations = defineRelations(tables, (r) => ({
  users: {
    posts: r.many.posts({
      from: r.users.id,
      to: r.posts.authorId,
    }),
  },
  posts: {
    author: r.one.users({
      from: r.posts.authorId,
      to: r.users.id,
    }),
  },
}))
// @filename: resolver.ts
import { query, resolver } from "@gqloom/core"
import { drizzleResolverFactory } from "@gqloom/drizzle"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/libsql"
import * as v from "valibot"
import { relations } from "./relations"
import { users } from "./schema"

const db = drizzle({
  relations,
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

In the above code, we use `valibot` to define the input type. `v.object({ id: v.number() })` defines the type of the input object, and `v.transform(({ id }) => ({ where: { id } }))` converts the input parameters into Drizzle query parameters.

### Adding Middleware

The pre-defined queries, mutations, and fields of the resolver factory support adding middleware. You can define middleware through the `middlewares` option:

```ts twoslash
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

export const posts = drizzleSilk(
  t.sqliteTable("posts", {
    id: t.int().primaryKey({ autoIncrement: true }),
    title: t.text().notNull(),
    content: t.text(),
    authorId: t.int().references(() => users.id, { onDelete: "cascade" }),
  })
)
// @filename: relations.ts
import { defineRelations } from "drizzle-orm"
import * as tables from "./schema"

export const relations = defineRelations(tables, (r) => ({
  users: {
    posts: r.many.posts({
      from: r.users.id,
      to: r.posts.authorId,
    }),
  },
  posts: {
    author: r.one.users({
      from: r.posts.authorId,
      to: r.users.id,
    }),
  },
}))
// @filename: resolver.ts
import { query, field, resolver } from "@gqloom/core"
import { createMemoization } from "@gqloom/core/context"
import { drizzleResolverFactory } from "@gqloom/drizzle"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/libsql"
import { GraphQLError } from "graphql"
import * as v from "valibot"
import { relations } from "./relations"
import { users, posts } from "./schema"

const db = drizzle({
  relations,
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

export const posts = drizzleSilk(
  t.sqliteTable("posts", {
    id: t.int().primaryKey({ autoIncrement: true }),
    title: t.text().notNull(),
    content: t.text(),
    authorId: t.int().references(() => users.id, { onDelete: "cascade" }),
  })
)
// @filename: relations.ts
import { defineRelations } from "drizzle-orm"
import * as tables from "./schema"

export const relations = defineRelations(tables, (r) => ({
  users: {
    posts: r.many.posts({
      from: r.users.id,
      to: r.posts.authorId,
    }),
  },
  posts: {
    author: r.one.users({
      from: r.posts.authorId,
      to: r.users.id,
    }),
  },
}))
// @filename: resolver.ts
import { query, resolver } from "@gqloom/core"
import { drizzleResolverFactory } from "@gqloom/drizzle"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/libsql"
import * as v from "valibot"
import { relations } from "./relations"
import { users } from "./schema"

const db = drizzle({
  relations,
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

<Tabs groupId="drizzle-api-version">
<template #Relational_API_v2>

<!--@include: @/snippets/drizzle/v2-type-mapping.md-->

</template>
<template #Relational_API_v1>

<!--@include: @/snippets/drizzle/v1-type-mapping.md-->

</template>
</Tabs>

Pass the configuration to the `weave` function when weaving the GraphQL Schema:

```ts
import { weave } from "@gqloom/core"

export const schema = weave(drizzleWeaverConfig, usersResolver, postsResolver)
```

## Default Type Mapping

The following table lists the default mapping relationships between Drizzle types and GraphQL types in GQLoom:

<Tabs groupId="drizzle-api-version">
<template #Relational_API_v2>

<!--@include: @/snippets/drizzle/v2-default-mapping.md-->

</template>
<template #Relational_API_v1>

<!--@include: @/snippets/drizzle/v1-default-mapping.md-->

</template>
</Tabs>