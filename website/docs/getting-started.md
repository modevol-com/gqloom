---
title: Getting Started
icon: PencilRuler
---
<script setup>
import InputSchemaCodes from "@/components/input-schema-codes.vue"
import { inputSchema } from "@/components/input-schema.ts"
</script>
<style>
@reference "@/css/tailwind.css";

.input-schema,
.input-schema-active {
  @apply font-bold cursor-pointer underline hover:opacity-90 transition-opacity;
}
.input-schema {
  @apply opacity-70;
}
</style>

# Getting Started

To quickly get started with GQLoom, we will build a simple GraphQL backend application together.

We will build a cattery application and provide a GraphQL API to the outside.
This application will include some simple functions:
- Cat basic information management: Enter the basic information of cats, including name, birthday, etc., update, delete and query cats;
- User (cat owner) registration management: Enter user information, a simple login function, and view one's own or other users' cats;

We will use the following technologies:
- [TypeScript](https://www.typescriptlang.org/): As our development language;
- [Node.js](https://nodejs.org/): As the runtime of our application;
- [graphql.js](https://github.com/graphql/graphql-js): The JavaScript implementation of GraphQL;
- [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server): A comprehensive GraphQL HTTP adapter;
- [Drizzle ORM](https://orm.drizzle.team/): A fast and type-safe ORM that helps us operate the database;
- [Valibot](https://valibot.dev/) or [Zod](https://zod.dev/): Used to define and validate inputs;
- `GQLoom`: Allows us to define GraphQL Schema comfortably and efficiently and write resolvers;

## Prerequisites

We only need to install [Node.js](https://nodejs.org/) version 20 or higher to run our application.

## Create the Application

### Project Structure

Our application will have the following structure:

```text
cattery/
├── src/
│   ├── contexts/
│   │   └── index.ts
│   ├── providers/
│   │   └── index.ts
│   ├── resolvers/
│   │   ├── cat.ts
│   │   ├── index.ts
│   │   └── user.ts
│   ├── schema/
│   │   └── index.ts
│   ├── services/
│   │   ├── index.ts
│   │   └── user.ts
│   └── index.ts
├── drizzle.config.ts
├── package.json
└── tsconfig.json
```

Among them, the functions of each folder or file under the `src` directory are as follows:

- `contexts`: Store contexts, such as the current user;
- `providers`: Store functions that need to interact with external services, such as database connections and Redis connections;
- `resolvers`: Store GraphQL resolvers;
- `schema`: Store the schema, mainly the database table structure;
- `services`: Store business logic, such as user login, user registration, etc.;
- `index.ts`: Used to run the GraphQL application in the form of an HTTP service;

::: info
GQLoom has no requirements for the project's file structure. Here is just for reference. In practice, you can organize the files according to your needs and preferences.
:::

### Initialize the Project

First, let's create a new folder and initialize the project:

::: code-group
```sh [npm]
mkdir cattery
cd ./cattery
npm init -y
```
```sh [pnpm]
mkdir cattery
cd ./cattery
pnpm init
```
```sh [yarn]
mkdir cattery
cd ./cattery
yarn init -y
```
:::

Then, we will install some necessary dependencies to run a TypeScript application in Node.js:

::: code-group
```sh [npm]
npm i -D typescript @types/node tsx
npx tsc --init
```
```sh [pnpm]
pnpm add -D typescript @types/node tsx
pnpm exec tsc --init
```
```sh [yarn]
yarn add -D typescript @types/node tsx
yarn dlx -q -p typescript tsc --init
```
:::

Next, we will install GQLoom and related dependencies. We can choose [Valibot](https://valibot.dev/) or [Zod](https://zod.dev/) to define and validate inputs:

::: code-group
```sh [npm]
# use Valibot
npm i graphql graphql-yoga @gqloom/core valibot @gqloom/valibot

# use Zod
npm i graphql graphql-yoga @gqloom/core zod @gqloom/zod
```

```sh [pnpm]
# use Valibot
pnpm add graphql graphql-yoga @gqloom/core valibot @gqloom/valibot

# use Zod
pnpm add graphql graphql-yoga @gqloom/core zod @gqloom/zod
```

```sh [yarn]
# use Valibot
yarn add graphql graphql-yoga @gqloom/core valibot @gqloom/valibot

# use zod
yarn add graphql graphql-yoga @gqloom/core zod @gqloom/zod
```
:::

### Hello World

Let's write our first [resolver](./resolver), we can choose to use <span :class="[inputSchema==='valibot'?'input-schema-active':'input-schema']" @click="inputSchema='valibot'">Valibot</span> or <span :class="[inputSchema==='zod'?'input-schema-active':'input-schema']"  @click="inputSchema='zod'">Zod</span>::

<InputSchemaCodes>
<template v-slot:valibot>

<<< @/snippets/getting-started/resolvers/index.ts{ts twoslash} [Valibot]

</template>
<template v-slot:zod>

<<< @/snippets/getting-started-zod/resolvers/index.ts{ts twoslash} [Zod]

</template>
</InputSchemaCodes>

We need to weave this resolver into a GraphQL Schema and run it as an HTTP server:

<InputSchemaCodes>
<template v-slot:valibot>

<<< @/snippets/getting-started/index.ts{ts}

</template>
<template v-slot:zod>

<<< @/snippets/getting-started-zod/index.ts{ts}

</template>
</InputSchemaCodes>

Great, we have already created a simple GraphQL application.
Next, let's try to run this application. Add the `dev` script to the `package.json`: 
```JSON
{
  "scripts": {
    "dev": "tsx watch src/index.ts"
  }
}
```

Now let's run it:

::: code-group
```sh [npm]
npm run dev
```
```sh [pnpm]
pnpm dev
```
```sh [yarn]
yarn dev
```
:::

Open http://localhost:4000/graphql in the browser and you can see the GraphQL playground.
Let's try to send a GraphQL query. Enter the following in the playground:

```GraphQL
{
  hello(name: "GQLoom")
}
```

Click the query button, and you can see the result:

```JSON
{
  "data": {
    "hello": "Hello GQLoom!"
  }
}
```

So far, we have created the simplest GraphQL application.

Next, we will use Drizzle ORM to interact with the database and add complete functions.

## Initialize the Database and Tables

First, let's install [Drizzle ORM](https://orm.drizzle.team/). We will use it to operate the **SQLite** database.

::: code-group
```sh [npm]
npm i @gqloom/drizzle drizzle-orm @libsql/client dotenv
npm i -D drizzle-kit
```
```sh [pnpm]
pnpm add @gqloom/drizzle drizzle-orm @libsql/client dotenv
pnpm add -D drizzle-kit
```
```sh [yarn]
yarn add @gqloom/drizzle drizzle-orm @libsql/client dotenv
yarn add -D drizzle-kit
```
:::

### Define Database Tables

Next, define the database tables in the `src/schema/index.ts` file. We will define two tables, `users` and `cats`, and establish the relationship between them:

```ts twoslash
// src/schema/index.ts
import { drizzleSilk } from "@gqloom/drizzle"
import { relations } from "drizzle-orm"
import * as t from "drizzle-orm/sqlite-core"

export const users = drizzleSilk(
  t.sqliteTable("users", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    phone: t.text().notNull().unique(),
  })
)

export const usersRelations = relations(users, ({ many }) => ({
  cats: many(cats),
}))

export const cats = drizzleSilk(
  t.sqliteTable("cats", {
    id: t.integer().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    birthday: t.integer({ mode: "timestamp" }).notNull(),
    ownerId: t
      .integer()
      .notNull()
      .references(() => users.id),
  })
)

export const catsRelations = relations(cats, ({ one }) => ({
  owner: one(users, {
    fields: [cats.ownerId],
    references: [users.id],
  }),
}))
```

### Initialize the Database

We need to create a configuration file:
```ts
// drizzle.config.ts
import "dotenv/config"
import { defineConfig } from "drizzle-kit"

export default defineConfig({
  out: "./drizzle",
  schema: "./src/schema/index.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DB_FILE_NAME ?? "file:local.db",
  },
})
```

Then we run the `drizzle-kit push` command to create the defined tables in the database:
```sh
npx drizzle-kit push
```

### Use the Database

To use the database in the application, we need to create a database instance:
```ts
// src/providers/index.ts
import { drizzle } from "drizzle-orm/libsql"
import * as schema from "../schema"

export const db = drizzle(process.env.DB_FILE_NAME ?? "file:local.db", {
  schema,
})
```

Let's first create a user service, which will contain a series of operations on the user table.
We will implement the user service in the `src/services/user.ts` file and export the entire `user.ts` as `userService` in the `src/resolvers/index.ts` file:

::: code-group
```ts [services/user.ts]
// src/services/user.ts
import { eq } from "drizzle-orm"
import { db } from "../providers"
import { users } from "../schema"

export async function createUser(input: typeof users.$inferInsert) {
  const [user] = await db.insert(users).values(input).returning()
  return user
}

export async function findUsersByName(name: string) {
  return await db.query.users.findMany({
    where: eq(users.name, name),
  })
}

export async function findUserByPhone(phone: string) {
  return await db.query.users.findFirst({
    where: eq(users.phone, phone),
  })
}
```
```ts [services/index.ts]
// src/services/index.ts
export * as userService from "./user"
```
:::

## Resolvers

Now, we can use the user service in the resolver. We will create a user resolver and add the following operations:

- `usersByName`: Find users by name
- `userByPhone`: Find users by phone number
- `createUser`: Create a user

After completing the user resolver, we also need to add it to the `resolvers` in the `src/resolvers/index.ts` file:

<InputSchemaCodes>

<template v-slot:valibot>

::: code-group

```ts twoslash [resolvers/user.ts]
// @filename: schema.ts
import { drizzleSilk } from "@gqloom/drizzle"
import { relations } from "drizzle-orm"
import * as t from "drizzle-orm/sqlite-core"

export const users = drizzleSilk(
  t.sqliteTable("users", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    phone: t.text().notNull().unique(),
  })
)

export const usersRelations = relations(users, ({ many }) => ({
  cats: many(cats),
}))

export const cats = drizzleSilk(
  t.sqliteTable("cats", {
    id: t.integer().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    birthday: t.integer({ mode: "timestamp" }).notNull(),
    ownerId: t
      .integer()
      .notNull()
      .references(() => users.id),
  })
)

export const catsRelations = relations(cats, ({ one }) => ({
  owner: one(users, {
    fields: [cats.ownerId],
    references: [users.id],
  }),
}))
// @filename: providers/index.ts
import { drizzle } from "drizzle-orm/libsql"
import * as schema from "../schema"

export const db = drizzle(process.env.DB_FILE_NAME ?? "file:local.db", {
  schema,
})
// @filename: services/user.ts
import { eq } from "drizzle-orm"
import { db } from "../providers"
import { users } from "../schema"

export async function createUser(input: typeof users.$inferInsert) {
  const [user] = await db.insert(users).values(input).returning()
  return user
}

export async function findUsersByName(name: string) {
  return await db.query.users.findMany({
    where: eq(users.name, name),
  })
}

export async function findUserByPhone(phone: string) {
  return await db.query.users.findFirst({
    where: eq(users.phone, phone),
  })
}
// @filename: services/index.ts
export * as userService from "./user"
// @filename: resolvers/user.ts
// ---cut---
// src/resolvers/user.ts
import { mutation, query, resolver } from "@gqloom/core"
import * as v from "valibot"
import { users } from "../schema"
import { userService } from "../services"

export const userResolver = resolver.of(users, {
  usersByName: query(users.$list())
    .input({ name: v.string() })
    .resolve(({ name }) => userService.findUsersByName(name)),

  userByPhone: query(users.$nullable())
    .input({ phone: v.string() })
    .resolve(({ phone }) => userService.findUserByPhone(phone)),

  createUser: mutation(users)
    .input({
      data: v.object({
        name: v.string(),
        phone: v.string(),
      }),
    })
    .resolve(async ({ data }) => userService.createUser(data)),
})
```

```ts [resolvers/index.ts]
// src/resolvers/user.ts
import { query, resolver } from "@gqloom/core"
import * as v from "valibot"
import { userResolver } from "./user"  // [!code ++]

const helloResolver = resolver({
  hello: query(v.string())
    .input({ name: v.nullish(v.string(), "World") })
    .resolve(({ name }) => `Hello ${name}!`),
})

export const resolvers = [helloResolver, userResolver]  // [!code ++]
```
:::

</template>

<template v-slot:zod>

::: code-group

```ts twoslash [resolvers/user.ts]
// @filename: schema.ts
import { drizzleSilk } from "@gqloom/drizzle"
import { relations } from "drizzle-orm"
import * as t from "drizzle-orm/sqlite-core"

export const users = drizzleSilk(
  t.sqliteTable("users", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    phone: t.text().notNull().unique(),
  })
)

export const usersRelations = relations(users, ({ many }) => ({
  cats: many(cats),
}))

export const cats = drizzleSilk(
  t.sqliteTable("cats", {
    id: t.integer().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    birthday: t.integer({ mode: "timestamp" }).notNull(),
    ownerId: t
      .integer()
      .notNull()
      .references(() => users.id),
  })
)

export const catsRelations = relations(cats, ({ one }) => ({
  owner: one(users, {
    fields: [cats.ownerId],
    references: [users.id],
  }),
}))
// @filename: providers/index.ts
import { drizzle } from "drizzle-orm/libsql"
import * as schema from "../schema"

export const db = drizzle(process.env.DB_FILE_NAME ?? "file:local.db", {
  schema,
})
// @filename: services/user.ts
import { eq } from "drizzle-orm"
import { db } from "../providers"
import { users } from "../schema"

export async function createUser(input: typeof users.$inferInsert) {
  const [user] = await db.insert(users).values(input).returning()
  return user
}

export async function findUsersByName(name: string) {
  return await db.query.users.findMany({
    where: eq(users.name, name),
  })
}

export async function findUserByPhone(phone: string) {
  return await db.query.users.findFirst({
    where: eq(users.phone, phone),
  })
}
// @filename: services/index.ts
export * as userService from "./user"
// @filename: resolvers/user.ts
// ---cut---
// src/resolvers/user.ts
import { mutation, query, resolver } from "@gqloom/core"
import { z } from "zod"
import { users } from "../schema"
import { userService } from "../services"

export const userResolver = resolver({
  usersByName: query(users.$list())
    .input({ name: z.string() })
    .resolve(({ name }) => userService.findUsersByName(name)),

  userByPhone: query(users.$nullable())
    .input({ phone: z.string() })
    .resolve(({ phone }) => userService.findUserByPhone(phone)),

  createUser: mutation(users)
    .input({
      data: z.object({
        name: z.string(),
        phone: z.string(),
      }),
    })
    .resolve(async ({ data }) => userService.createUser(data)),
})
```

```ts [resolvers/index.ts]
// src/resolvers/user.ts
import { query, resolver } from "@gqloom/core"
import { z } from "zod"
import { userResolver } from "./user" // [!code ++]

const helloResolver = resolver({
  hello: query(z.string())
    .input({
      name: z
        .string()
        .nullish()
        .transform((x) => x ?? "World"),
    })
    .resolve(({ name }) => `Hello ${name}!`),
})

export const resolvers = [helloResolver, userResolver] // [!code ++]
```

:::

</template>

</InputSchemaCodes>

Great, now let's try it in the playground:

::: code-group
```GraphQL [Mutation]
mutation {
  createUser(data: {name: "Bob", phone: "001"}) {
    id
    name
    phone
  }
}
```

```JSON [Response]
{
  "data": {
    "createUser": {
      "id": 1,
      "name": "Bob",
      "phone": "001"
    }
  }
}
```
::: 

Let's continue to try to retrieve the user we just created:

::: code-group
```GraphQL [Query]
{
  usersByName(name: "Bob") {
    id
    name
    phone
  }
}
```

```JSON [Response]
{
  "data": {
    "usersByName": [
      {
        "id": 1,
        "name": "Bob",
        "phone": "001"
      }
    ]
  }
}
```
:::

### Current User Context

Next, let's try to add a simple login function and add a query operation to the user resolver:

- `mine`: Return the current user information

To implement this query, we first need to have a login function. Let's write a simple one:

```ts twoslash
// @filename: schema.ts
import { drizzleSilk } from "@gqloom/drizzle"
import { relations } from "drizzle-orm"
import * as t from "drizzle-orm/sqlite-core"

export const users = drizzleSilk(
  t.sqliteTable("users", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    phone: t.text().notNull().unique(),
  })
)

export const usersRelations = relations(users, ({ many }) => ({
  cats: many(cats),
}))

export const cats = drizzleSilk(
  t.sqliteTable("cats", {
    id: t.integer().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    birthday: t.integer({ mode: "timestamp" }).notNull(),
    ownerId: t
      .integer()
      .notNull()
      .references(() => users.id),
  })
)

export const catsRelations = relations(cats, ({ one }) => ({
  owner: one(users, {
    fields: [cats.ownerId],
    references: [users.id],
  }),
}))
// @filename: providers/index.ts
import { drizzle } from "drizzle-orm/libsql"
import * as schema from "../schema"

export const db = drizzle(process.env.DB_FILE_NAME ?? "file:local.db", {
  schema,
})
// @filename: services/user.ts
import { eq } from "drizzle-orm"
import { db } from "../providers"
import { users } from "../schema"

export async function createUser(input: typeof users.$inferInsert) {
  const [user] = await db.insert(users).values(input).returning()
  return user
}

export async function findUsersByName(name: string) {
  return await db.query.users.findMany({
    where: eq(users.name, name),
  })
}

export async function findUserByPhone(phone: string) {
  return await db.query.users.findFirst({
    where: eq(users.phone, phone),
  })
}
// @filename: services/index.ts
export * as userService from "./user"
// @filename: contexts/index.ts
// ---cut---
// src/contexts/index.ts
import { createMemoization, useContext } from "@gqloom/core"
import { GraphQLError } from "graphql"
import type { YogaInitialContext } from "graphql-yoga"
import { userService } from "../services"

export const useCurrentUser = createMemoization(async () => {
  const phone =
    useContext<YogaInitialContext>().request.headers.get("authorization")
  if (phone == null) throw new GraphQLError("Unauthorized")

  const user = await userService.findUserByPhone(phone)
  if (user == null) throw new GraphQLError("Unauthorized")
  return user
})
```

In the above code, we created a [context](./context) function for getting the current user, which will return the information of the current user. We use `createMemoization()` to memoize this function, which ensures that this function is only executed once within the same request to avoid unnecessary database queries.

We used `useContext()` to get the context provided by Yoga, and obtained the user's phone number from the request header, and found the user according to the phone number. If the user does not exist, a `GraphQLError` will be thrown.

<Callout type="warn">
As you can see, this login function is very simple and is only used for demonstration purposes, and it does not guarantee security at all. In practice, it is usually recommended to use solutions such as `session` or `jwt`.
</Callout>

Now, we add the new query operation in the resolver:

<InputSchemaCodes>

<template v-slot:valibot>

```ts title="src/resolvers/user.ts"
import { mutation, query, resolver } from "@gqloom/core"
import * as v from "valibot"
import { useCurrentUser } from "../contexts" // [!code ++]
import { users } from "../schema"
import { userService } from "../services"

export const userResolver = resolver({
  mine: query(users).resolve(() => useCurrentUser()), // [!code ++]

  usersByName: query(users.$list())
    .input({ name: v.string() })
    .resolve(({ name }) => userService.findUsersByName(name)),

  userByPhone: query(users.$nullable())
    .input({ phone: v.string() })
    .resolve(({ phone }) => userService.findUserByPhone(phone)),

  createUser: mutation(users)
    .input({
      data: v.object({
        name: v.string(),
        phone: v.string(),
      }),
    })
    .resolve(async ({ data }) => userService.createUser(data)),
})
```

</template>

<template v-slot:zod>

```ts title="src/resolvers/user.ts"
import { mutation, query, resolver } from "@gqloom/core"
import { z } from "zod"
import { useCurrentUser } from "../contexts" // [!code ++]
import { users } from "../schema"
import { userService } from "../services"

export const userResolver = resolver({
  mine: query(users).resolve(() => useCurrentUser()), // [!code ++]

  usersByName: query(users.$list())
    .input({ name: z.string() })
    .resolve(({ name }) => userService.findUsersByName(name)),

  userByPhone: query(users.$nullable())
    .input({ phone: z.string() })
    .resolve(({ phone }) => userService.findUserByPhone(phone)),

  createUser: mutation(users)
    .input({
      data: z.object({
        name: z.string(),
        phone: z.string(),
      }),
    })
    .resolve(async ({ data }) => userService.createUser(data)),
})
```

</template>

</InputSchemaCodes>

If we directly call this new query in the playground, the application will give us an unauthorized error:
::: code-group
```GraphQL [Query]
{
  mine {
    id
    name
    phone
  }
}
```
```JSON [Response]
{
  "errors": [
    {
      "message": "Unauthorized",
      "locations": [
        {
          "line": 2,
          "column": 3
        }
      ],
      "path": [
        "mine"
      ]
    }
  ],
  "data": null
}
```
:::

Open the `Headers` at the bottom of the playground and add the `authorization` field to the request header. Here we use the phone number of `Bob` created in the previous step, so we are logged in as `Bob`:

::: code-group
```JSON [Headers]
{
  "authorization": "001"
}
```
```GraphQL [Query]
{
  mine {
    id
    name
    phone
  }
}
```
```JSON [Response]
{
  "data": {
    "mine": {
      "id": 1,
      "name": "Bob",
      "phone": "001"
    }
  }
}
```
:::

### Resolver Factory

Next, we will add the business logic related to cats.

We use the [resolver factory](./schema/drizzle#resolver-factory) to quickly create interfaces:

<InputSchemaCodes>

<template v-slot:valibot>

::: code-group

```ts twoslash [resolvers/cat.ts]
// @filename: schema.ts
import { drizzleSilk } from "@gqloom/drizzle"
import { relations } from "drizzle-orm"
import * as t from "drizzle-orm/sqlite-core"

export const users = drizzleSilk(
  t.sqliteTable("users", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    phone: t.text().notNull().unique(),
  })
)

export const usersRelations = relations(users, ({ many }) => ({
  cats: many(cats),
}))

export const cats = drizzleSilk(
  t.sqliteTable("cats", {
    id: t.integer().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    birthday: t.integer({ mode: "timestamp" }).notNull(),
    ownerId: t
      .integer()
      .notNull()
      .references(() => users.id),
  })
)

export const catsRelations = relations(cats, ({ one }) => ({
  owner: one(users, {
    fields: [cats.ownerId],
    references: [users.id],
  }),
}))
// @filename: providers/index.ts
import { drizzle } from "drizzle-orm/libsql"
import * as schema from "../schema"

export const db = drizzle(process.env.DB_FILE_NAME ?? "file:local.db", {
  schema,
})
// @filename: resolvers/cat.ts
// ---cut---
// src/resolvers/cat.ts
import { field, resolver } from "@gqloom/core"
import { drizzleResolverFactory } from "@gqloom/drizzle"
import * as v from "valibot"
import { db } from "../providers"
import { cats } from "../schema"

const catResolverFactory = drizzleResolverFactory(db, "cats")

export const catResolver = resolver.of(cats, {
  cats: catResolverFactory.selectArrayQuery(),

  age: field(v.pipe(v.number()))
    .input({
      currentYear: v.nullish(v.pipe(v.number(), v.integer()), () =>
        new Date().getFullYear()
      ),
    })
    .resolve((cat, { currentYear }) => {
      return currentYear - cat.birthday.getFullYear()
    }),
})
```

```ts [resolvers/index.ts]
// src/resolvers/index.ts
import { query, resolver } from "@gqloom/core"
import * as v from "valibot"
import { catResolver } from "./cat" // [!code ++]
import { userResolver } from "./user"

const helloResolver = resolver({
  hello: query(v.string())
    .input({ name: v.nullish(v.string(), "World") })
    .resolve(({ name }) => `Hello ${name}!`),
})

export const resolvers = [helloResolver, userResolver, catResolver] // [!code ++]
```

:::

</template>

<template v-slot:zod>

::: code-group

```ts twoslash [resolvers/cat.ts]
// @filename: schema.ts
import { drizzleSilk } from "@gqloom/drizzle"
import { relations } from "drizzle-orm"
import * as t from "drizzle-orm/sqlite-core"

export const users = drizzleSilk(
  t.sqliteTable("users", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    phone: t.text().notNull().unique(),
  })
)

export const usersRelations = relations(users, ({ many }) => ({
  cats: many(cats),
}))

export const cats = drizzleSilk(
  t.sqliteTable("cats", {
    id: t.integer().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    birthday: t.integer({ mode: "timestamp" }).notNull(),
    ownerId: t
      .integer()
      .notNull()
      .references(() => users.id),
  })
)

export const catsRelations = relations(cats, ({ one }) => ({
  owner: one(users, {
    fields: [cats.ownerId],
    references: [users.id],
  }),
}))
// @filename: providers/index.ts
import { drizzle } from "drizzle-orm/libsql"
import * as schema from "../schema"

export const db = drizzle(process.env.DB_FILE_NAME ?? "file:local.db", {
  schema,
})
// @filename: resolvers/cat.ts
// ---cut---
// src/resolvers/cat.ts
import { field, resolver } from "@gqloom/core"
import { drizzleResolverFactory } from "@gqloom/drizzle"
import { z } from "zod"
import { db } from "../providers"
import { cats } from "../schema"

const catResolverFactory = drizzleResolverFactory(db, "cats")

export const catResolver = resolver.of(cats, {
  cats: catResolverFactory.selectArrayQuery(),

  age: field(z.number().int())
    .input({
      currentYear: z
        .number()
        .int()
        .nullish()
        .transform((x) => x ?? new Date().getFullYear()),
    })
    .resolve((cat, { currentYear }) => {
      return currentYear - cat.birthday.getFullYear()
    }),
})
```

```ts [resolvers/index.ts]
import { query, resolver } from "@gqloom/core"
import { z } from "zod"
import { catResolver } from "./cat" // [!code ++]
import { userResolver } from "./user"

const helloResolver = resolver({
  hello: query(z.string())
    .input({
      name: z
        .string()
        .nullish()
        .transform((x) => x ?? "World"),
    })
    .resolve(({ name }) => `Hello ${name}!`),
})

export const resolvers = [helloResolver, userResolver, catResolver] // [!code ++]
```

:::

</template>

</InputSchemaCodes>

In the above code, we used `drizzleResolverFactory()` to create `catResolverFactory` for quickly building resolvers.

We added a query that uses `catResolverFactory` to select data and named it `cats`. This query will provide full query operations on the `cats` table.
In addition, we also added an additional `age` field for cats to get the age of the cats.

Next, let's try to add a `createCat` mutation. We want only logged-in users to access this interface, and the created cats will belong to the current user:

<InputSchemaCodes>

<template v-slot:valibot>

```ts twoslash
// @filename: schema.ts
import { drizzleSilk } from "@gqloom/drizzle"
import { relations } from "drizzle-orm"
import * as t from "drizzle-orm/sqlite-core"

export const users = drizzleSilk(
  t.sqliteTable("users", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    phone: t.text().notNull().unique(),
  })
)

export const usersRelations = relations(users, ({ many }) => ({
  cats: many(cats),
}))

export const cats = drizzleSilk(
  t.sqliteTable("cats", {
    id: t.integer().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    birthday: t.integer({ mode: "timestamp" }).notNull(),
    ownerId: t
      .integer()
      .notNull()
      .references(() => users.id),
  })
)

export const catsRelations = relations(cats, ({ one }) => ({
  owner: one(users, {
    fields: [cats.ownerId],
    references: [users.id],
  }),
}))
// @filename: providers/index.ts
import { drizzle } from "drizzle-orm/libsql"
import * as schema from "../schema"

export const db = drizzle(process.env.DB_FILE_NAME ?? "file:local.db", {
  schema,
})
// @filename: services/user.ts
import { eq } from "drizzle-orm"
import { db } from "../providers"
import { users } from "../schema"

export async function createUser(input: typeof users.$inferInsert) {
  const [user] = await db.insert(users).values(input).returning()
  return user
}

export async function findUsersByName(name: string) {
  return await db.query.users.findMany({
    where: eq(users.name, name),
  })
}

export async function findUserByPhone(phone: string) {
  return await db.query.users.findFirst({
    where: eq(users.phone, phone),
  })
}
// @filename: services/index.ts
export * as userService from "./user"
// @filename: contexts/index.ts
import { createMemoization, useContext } from "@gqloom/core"
import { GraphQLError } from "graphql"
import type { YogaInitialContext } from "graphql-yoga"
import { userService } from "../services"

export const useCurrentUser = createMemoization(async () => {
  const phone =
    useContext<YogaInitialContext>().request.headers.get("authorization")
  if (phone == null) throw new GraphQLError("Unauthorized")

  const user = await userService.findUserByPhone(phone)
  if (user == null) throw new GraphQLError("Unauthorized")
  return user
})
// @filename: resolvers/cat.ts
// ---cut---
// src/resolvers/cat.ts
import { field, resolver } from "@gqloom/core"
import { drizzleResolverFactory } from "@gqloom/drizzle"
import * as v from "valibot"
import { useCurrentUser } from "../contexts"
import { db } from "../providers"
import { cats } from "../schema"

const catResolverFactory = drizzleResolverFactory(db, "cats")

export const catResolver = resolver.of(cats, {
  cats: catResolverFactory.selectArrayQuery(),

  age: field(v.pipe(v.number()))
    .input({
      currentYear: v.nullish(v.pipe(v.number(), v.integer()), () =>
        new Date().getFullYear()
      ),
    })
    .resolve((cat, { currentYear }) => {
      return currentYear - cat.birthday.getFullYear()
    }),

  createCats: catResolverFactory.insertArrayMutation({ // [!code ++]
    input: v.pipeAsync( // [!code ++]
      v.objectAsync({ // [!code ++]
        values: v.arrayAsync( // [!code ++]
          v.pipeAsync( // [!code ++]
            v.object({ // [!code ++]
              name: v.string(), // [!code ++]
              birthday: v.pipe( // [!code ++]
                v.string(), // [!code ++]
                v.transform((x) => new Date(x)) // [!code ++]
              ), // [!code ++]
            }), // [!code ++]
            v.transformAsync(async ({ name, birthday }) => ({ // [!code ++]
              name, // [!code ++]
              birthday, // [!code ++]
              ownerId: (await useCurrentUser()).id, // [!code ++]
            })) // [!code ++]
          ) // [!code ++]
        ), // [!code ++]
      }) // [!code ++]
    ), // [!code ++]
  }), // [!code ++]
})
```

</template>

<template v-slot:zod>

```ts twoslash title="src/resolvers/cat.ts"
// @filename: schema.ts
import { drizzleSilk } from "@gqloom/drizzle"
import { relations } from "drizzle-orm"
import * as t from "drizzle-orm/sqlite-core"

export const users = drizzleSilk(
  t.sqliteTable("users", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    phone: t.text().notNull().unique(),
  })
)

export const usersRelations = relations(users, ({ many }) => ({
  cats: many(cats),
}))

export const cats = drizzleSilk(
  t.sqliteTable("cats", {
    id: t.integer().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    birthday: t.integer({ mode: "timestamp" }).notNull(),
    ownerId: t
      .integer()
      .notNull()
      .references(() => users.id),
  })
)

export const catsRelations = relations(cats, ({ one }) => ({
  owner: one(users, {
    fields: [cats.ownerId],
    references: [users.id],
  }),
}))
// @filename: providers/index.ts
import { drizzle } from "drizzle-orm/libsql"
import * as schema from "../schema"

export const db = drizzle(process.env.DB_FILE_NAME ?? "file:local.db", {
  schema,
})
// @filename: services/user.ts
import { eq } from "drizzle-orm"
import { db } from "../providers"
import { users } from "../schema"

export async function createUser(input: typeof users.$inferInsert) {
  const [user] = await db.insert(users).values(input).returning()
  return user
}

export async function findUsersByName(name: string) {
  return await db.query.users.findMany({
    where: eq(users.name, name),
  })
}

export async function findUserByPhone(phone: string) {
  return await db.query.users.findFirst({
    where: eq(users.phone, phone),
  })
}
// @filename: services/index.ts
export * as userService from "./user"
// @filename: contexts/index.ts
import { createMemoization, useContext } from "@gqloom/core"
import { GraphQLError } from "graphql"
import type { YogaInitialContext } from "graphql-yoga"
import { userService } from "../services"

export const useCurrentUser = createMemoization(async () => {
  const phone =
    useContext<YogaInitialContext>().request.headers.get("authorization")
  if (phone == null) throw new GraphQLError("Unauthorized")

  const user = await userService.findUserByPhone(phone)
  if (user == null) throw new GraphQLError("Unauthorized")
  return user
})
// @filename: resolvers/cat.ts
// ---cut---
// src/resolvers/cat.ts
import { field, resolver } from "@gqloom/core"
import { drizzleResolverFactory } from "@gqloom/drizzle"
import { z } from "zod"
import { useCurrentUser } from "../contexts"
import { db } from "../providers"
import { cats } from "../schema"

const catResolverFactory = drizzleResolverFactory(db, "cats")

export const catResolver = resolver.of(cats, {
  cats: catResolverFactory.selectArrayQuery(),

  age: field(z.number().int())
    .input({
      currentYear: z
        .number()
        .int()
        .nullish()
        .transform((x) => x ?? new Date().getFullYear()),
    })
    .resolve((cat, { currentYear }) => {
      return currentYear - cat.birthday.getFullYear()
    }),

  createCats: catResolverFactory.insertArrayMutation({ // [!code ++]
    input: z.object({ // [!code ++]
      values: z // [!code ++]
        .object({ // [!code ++]
          name: z.string(), // [!code ++]
          birthday: z.coerce.date(), // [!code ++]
        }) // [!code ++]
        .transform(async ({ name, birthday }) => ({ // [!code ++]
          name, // [!code ++]
          birthday, // [!code ++]
          ownerId: (await useCurrentUser()).id, // [!code ++]
        })) // [!code ++]
        .array(), // [!code ++]
    }), // [!code ++]
  }), // [!code ++]
})
```

</template>

</InputSchemaCodes>

In the above code, we used `catResolverFactory` to create a mutation that adds more data to the `cats` table, and we overwrote the input of this mutation. When validating the input, we used `useCurrentUser()` to get the ID of the currently logged-in user and pass it as the value of `ownerId` to the `cats` table.

Now let's try to add a few cats in the playground:

::: code-group
```GraphQL [Mutation]
mutation {
  createCats(values: [
    { name: "Mittens", birthday: "2021-01-01" },
    { name: "Fluffy", birthday: "2022-02-02" },
  ]) {
    id
    name
    age
  }
}
```

```JSON [Headers]
{
  "authorization": "001"
}
```

```JSON [Response]
{
  "data": {
    "createCats": [
      {
        "id": 1,
        "name": "Mittens",
        "age": 4
      },
      {
        "id": 2,
        "name": "Fluffy",
        "age": 3
      }
    ]
  }
}
```
:::

Let's use the `cats` query to confirm the data in the database again:

::: code-group
```GraphQL [Query]
{
  cats {
    id
    name   
    age
  }
}
```

```JSON [Response]
{
  "data": {
    "cats": [
      {
        "id": 1,
        "name": "Mittens",
        "age": 4
      },
      {
        "id": 2,
        "name": "Fluffy",
        "age": 3
      }
    ]
  }
}
```
:::

### Associated Objects

We want to be able to get the owner of a cat when querying the cat, and also be able to get all the cats of a user when querying the user.
This is very easy to achieve in GraphQL.
Let's add an additional `owner` field to `cats` and an additional `cats` field to `users`:

<InputSchemaCodes>

<template v-slot:valibot>

::: code-group

```ts [resolvers/cat.ts]
// src/resolvers/cat.ts
import { field, resolver } from "@gqloom/core"
import { drizzleResolverFactory } from "@gqloom/drizzle"
import * as v from "valibot"
import { useCurrentUser } from "../contexts"
import { db } from "../providers"
import { cats } from "../schema"

const catResolverFactory = drizzleResolverFactory(db, "cats")

export const catResolver = resolver.of(cats, {
  cats: catResolverFactory.selectArrayQuery(),

  age: field(v.pipe(v.number()))
    .input({
      currentYear: v.nullish(v.pipe(v.number(), v.integer()), () =>
        new Date().getFullYear()
      ),
    })
    .resolve((cat, { currentYear }) => {
      return currentYear - cat.birthday.getFullYear()
    }),

  owner: catResolverFactory.relationField("owner"), // [!code ++]

  createCats: catResolverFactory.insertArrayMutation({
    input: v.pipeAsync(
      v.objectAsync({
        values: v.arrayAsync(
          v.pipeAsync(
            v.object({
              name: v.string(),
              birthday: v.pipe(
                v.string(),
                v.transform((x) => new Date(x))
              ),
            }),
            v.transformAsync(async ({ name, birthday }) => ({
              name,
              birthday,
              ownerId: (await useCurrentUser()).id,
            }))
          )
        ),
      })
    ),
  }),
})
```

```ts [resolvers/user.ts]
import { mutation, query, resolver } from "@gqloom/core"
import { drizzleResolverFactory } from "@gqloom/drizzle" // [!code ++]
import * as v from "valibot"
import { useCurrentUser } from "../contexts"
import { db } from "../providers" // [!code ++]
import { users } from "../schema"
import { userService } from "../services"

const userResolverFactory = drizzleResolverFactory(db, "users") // [!code ++]

export const userResolver = resolver.of(users, {
  cats: userResolverFactory.relationField("cats"), // [!code ++]

  mine: query(users).resolve(() => useCurrentUser()),

  usersByName: query(users.$list())
    .input({ name: v.string() })
    .resolve(({ name }) => userService.findUsersByName(name)),

  userByPhone: query(users.$nullable())
    .input({ phone: v.string() })
    .resolve(({ phone }) => userService.findUserByPhone(phone)),

  createUser: mutation(users)
    .input({
      data: v.object({
        name: v.string(),
        phone: v.string(),
      }),
    })
    .resolve(async ({ data }) => userService.createUser(data)),
})
```

:::

</template>

<template v-slot:zod>

::: code-group

```ts [resolvers/cat.ts]
import { field, resolver } from "@gqloom/core"
import { drizzleResolverFactory } from "@gqloom/drizzle"
import { z } from "zod"
import { useCurrentUser } from "../contexts"
import { db } from "../providers"
import { cats } from "../schema"

const catResolverFactory = drizzleResolverFactory(db, "cats")

export const catResolver = resolver.of(cats, {
  cats: catResolverFactory.selectArrayQuery(),

  age: field(z.number().int())
    .input({
      currentYear: z
        .number()
        .int()
        .nullish()
        .transform((x) => x ?? new Date().getFullYear()),
    })
    .resolve((cat, { currentYear }) => {
      return currentYear - cat.birthday.getFullYear()
    }),

  owner: catResolverFactory.relationField("owner"), // [!code ++]

  createCats: catResolverFactory.insertArrayMutation({
    input: z.object({
      values: z
        .object({
          name: z.string(),
          birthday: z.coerce.date(),
        })
        .transform(async ({ name, birthday }) => ({
          name,
          birthday,
          ownerId: (await useCurrentUser()).id,
        }))
        .array(),
    }), 
  }),
})
```

```ts [resolvers/user.ts]
import { mutation, query, resolver } from "@gqloom/core"
import { drizzleResolverFactory } from "@gqloom/drizzle" // [!code ++]
import { z } from "zod"
import { useCurrentUser } from "../contexts"
import { db } from "../providers" // [!code ++]
import { users } from "../schema"
import { userService } from "../services"

const userResolverFactory = drizzleResolverFactory(db, "users") // [!code ++]

export const userResolver = resolver.of(users, {
  cats: userResolverFactory.relationField("cats"),  // [!code ++]

  mine: query(users).resolve(() => useCurrentUser()),

  usersByName: query(users.$list())
    .input({ name: z.string() })
    .resolve(({ name }) => userService.findUsersByName(name)),

  userByPhone: query(users.$nullable())
    .input({ phone: z.string() })
    .resolve(({ phone }) => userService.findUserByPhone(phone)),

  createUser: mutation(users)
    .input({
      data: z.object({
        name: z.string(),
        phone: z.string(),
      }),
    })
    .resolve(async ({ data }) => userService.createUser(data)),
})
```

:::

</template>

</InputSchemaCodes>

In the above code, we used the resolver factory to create the `owner` field for `cats`; similarly, we also created the `cats` field for `users`.
Behind the scenes, the relationship fields created by the resolver factory will use `DataLoader` to query from the database to avoid the N+1 problem.

Let's try to query the owner of a cat in the playground:
::: code-group
```GraphQL [Query]
{
  cats {
    id
    name
    age
    owner {
      id
      name
      phone
    }
  }
}
```

```JSON [Response]
{
  "data": {
    "cats": [
      {
        "id": 1,
        "name": "Mittens",
        "age": 4,
        "owner": {
          "id": 1,
          "name": "Bob",
          "phone": "001"
        }
      },
      {
        "id": 2,
        "name": "Fluffy",
        "age": 3,
        "owner": {
          "id": 1,
          "name": "Bob",
          "phone": "001"
        }
      }
    ]
  }
}
```
:::

Let's try to query the cats of the current user:

::: code-group
```GraphQL [Query]
{
  mine {
    name
    cats {
      id
      name
      age
    }
  }
}
```

```JSON [Headers]
{
  "authorization": "001"
}
```

```JSON [Response]
{
  "data": {
    "mine": {
      "name": "Bob",
      "cats": [
        {
          "id": 1,
          "name": "Mittens",
          "age": 4
        },
        {
          "id": 2,
          "name": "Fluffy",
          "age": 3
        }
      ]
    }
  }
}
```
:::

## Conclusion

In this article, we created a simple GraphQL server-side application. We used the following tools:

- `Valibot` or `Zod`: Used to define and validate inputs;
- `Drizzle`: Used to operate the database, and directly use the `Drizzle` table as the `GraphQL` output type;
- Context: Used to share data between different parts of the program, which is very useful for scenarios such as implementing login and tracking logs;
- Resolver factory: Used to quickly create resolvers and operations;
- `GraphQL Yoga`: Used to create a GraphQL HTTP service and provides a GraphiQL playground;

Our application has implemented the functions of adding and querying `users` and `cats`, but due to space limitations, the update and delete functions have not been implemented. They can be quickly added through the resolver factory.

## Next Steps

- Check out the core concepts of GQLoom: [Silk](./silk), [Resolver](./resolver), [Weave](./weave);
- Learn about common functions: [Context](./context), [DataLoader](./dataloader), [Middleware](./middleware)
- Add a GraphQL client to the front-end project: [gql.tada](https://gql-tada.0no.co/), [Urql](https://commerce.nearform.com/open-source/urql/), [Apollo Client](https://www.apollographql.com/docs/react), [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/graphql), [Graffle](https://graffle.js.org/) 