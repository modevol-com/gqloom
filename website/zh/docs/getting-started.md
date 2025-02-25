---
title: 快速上手
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

# 快速上手

为了快速上手 GQLoom，我们将一起搭建一个简单的 GraphQL 后端应用。

我们将搭建一个猫舍应用，并为向外部提供 GraphQL API。
该应用将包含一些简单的功能：
- 猫基础信息管理：录入猫的的基本信息，包括名称、生日等，更新、删除和查询猫；
- 用户（猫主人）登记管理：录入用户信息，简单的登录功能，查看自己或其他用户的猫；

我们将使用以下技术：
- [TypeScript](https://www.typescriptlang.org/): 作为我们的开发语言；
- [Node.js](https://nodejs.org/): 作为我们应用的运行时；
- [graphql.js](https://github.com/graphql/graphql-js): GraphQL 的 JavaScript 实现；
- [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server): 功能全面的 GraphQL HTTP 适配器；
- [Drizzle ORM](https://orm.drizzle.team/): 一个快速且类型安全的 ORM，帮助我们操作数据库；
- [Valibot](https://valibot.dev/) 或者 [Zod](https://zod.dev/): 用于定义和验证输入；
- `GQLoom`: 让我们舒适且高效地定义 GraphQL Schema 并编写解析器（Resolver）；

## 前提条件

我们只需要安装版本 20 以上的 [Node.js](https://nodejs.org/) 来运行我们的应用。

## 创建应用

### 项目结构

我们的应用将有以下的结构：

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

其中，`src` 目录下的各个文件夹或文件的职能如下：

- `contexts`: 存放上下文，如当前用户；
- `providers`: 存放需要与外部服务交互的功能，如数据库连接、Redis 连接；
- `resolvers`: 存放 GraphQL 解析器；
- `schema`: 存放 schema，主要是数据库表结构；
- `services`: 存放业务逻辑，如用户登录、用户注册等；
- `index.ts`: 用于以 HTTP 服务的形式运行 GraphQL 应用；

::: info
GQLoom 对项目的文件结构没有任何要求，这里只提供一个参考，在实践中你可以按照需求和喜好组织文件。
:::

### 初始化项目

首先，让我们新建文件夹并初始化项目：

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

然后，我们将安装一些必要的依赖来以便在 Node.js 运行中 TypeScript 应用：

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

接下来，我们将安装 GQLoom 以及相关依赖，我们可以选择 [Valibot](https://valibot.dev/) 或者 [Zod](https://zod.dev/) 来定义并验证输入：

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

### 你好 世界

让我们编写第一个 [解析器](./resolver)，可以选择使用 <span :class="[inputSchema==='valibot'?'input-schema-active':'input-schema']" @click="inputSchema='valibot'">Valibot</span> 或者 <span :class="[inputSchema==='zod'?'input-schema-active':'input-schema']"  @click="inputSchema='zod'">Zod</span> ：

<InputSchemaCodes>
<template v-slot:valibot>

<<< @/snippets/getting-started/resolvers/index.ts{ts twoslash} [Valibot]

</template>
<template v-slot:zod>

<<< @/snippets/getting-started-zod/resolvers/index.ts{ts twoslash} [Zod]

</template>
</InputSchemaCodes>

我们需要将这个解析器编织成 GraphQL Schema，并以 HTTP 服务器的形式运行它：

<InputSchemaCodes>
<template v-slot:valibot>

<<< @/snippets/getting-started/index.ts{ts}

</template>
<template v-slot:zod>

<<< @/snippets/getting-started-zod/index.ts{ts}

</template>
</InputSchemaCodes>

很好，我们已经创建了一个简单的 GraphQL 应用。  
接下来我们尝试运行这个应用，在 `package.json` 里添加 `dev` 脚本：
```JSON
{
  "scripts": {
    "dev": "tsx watch src/index.ts"
  }
}
```

现在让我们运行一下：

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

在浏览器中打开 http://localhost:4000/graphql 就可以看到 GraphQL 演练场了。  
让我们尝试发送一个 GraphQL 查询，在演练场里输入:

```GraphQL
{
  hello(name: "GQLoom")
}
```

点击查询按钮，就可以看到结果了：

```JSON
{
  "data": {
    "hello": "Hello GQLoom!"
  }
}
```

到此为止，我们已经创建了一个最简单的 GraphQL 应用。

接下来我们将使用 Drizzle ORM 来与数据库交互并添加完整的功能。

## 初始化数据库和表格

首先，让我们安装 [Drizzle ORM](https://orm.drizzle.team/)，我们将使用它来操作 **SQLite** 数据库。

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

### 定义数据库表格

接下来在 `src/schema/index.ts` 文件中定义数据库表格，我们将定义 `users` 和 `cats` 两个表格，并建立它们之间的关系：

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

### 初始化数据库

我们需要创建一个配置文件:
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

然后我们运行 `drizzle-kit push` 命令在数据库中建立已定义的表格：
```sh
npx drizzle-kit push
```

### 使用数据库

为了在应用中使用数据库，我们需要创建一个数据库实例：
```ts
// src/providers/index.ts
import { drizzle } from "drizzle-orm/libsql"
import * as schema from "../schema"

export const db = drizzle(process.env.DB_FILE_NAME ?? "file:local.db", {
  schema,
})
```

让我们先创建一个用户服务，其中将包含一系列对用户表的操作。
我们将在 `src/services/user.ts` 文件中实现用户服务，并在 `src/resolvers/index.ts` 文件中将整个 `user.ts` 作为 `userService` 导出：

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

## 解析器

现在，我们可以在解析器中使用用户服务，我们将创建一个用户解析器添加以下操作：

- `usersByName`: 通过名称查找用户
- `userByPhone`: 通过手机号码查找用户
- `createUser`: 创建一个用户

在完成用户解析器后，我们还需要将它添加到 `src/resolvers/index.ts` 文件里的 `resolvers` 中：

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

很好，现在让我们在演练场尝试一下：

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

继续尝试找回刚刚创建的用户：

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

### 上下文

接下来，让我们尝试添加一个简单的登录功能，再为用户解析器添加一个查询操作：

- `mine`: 返回当前用户信息

为了实现这个查询，首先得有登录功能，让我们来简单写一个：

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

在上面的代码中，我们创建了一个用于获取当前用户的[上下文](./context)函数，它将返回当前用户的信息。我们使用 `createMemoization()` 将此函数记忆化，这确保在同一个请求内此函数仅执行一次，以避免多余的数据库查询。

我们使用 `useContext()` 获取了 Yoga 提供的上下文（Context），并从请求头中获取了用户的手机号码，并根据手机号码查找用户，如果用户不存在，则抛出 `GraphQLError`。

::: warning
如你所见，这个登录功能非常简陋，仅作为演示使用，完全不保证安全性。在实践中通常推荐使用 `session` 或者 `jwt` 等方案。
:::

现在，我们在解析器里添加新的查询操作：

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

如果我们在演练场里之间调用这个新的查询，应用程序将给我们未认证的错误：
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

点开演练场下方的 `Headers`，并在请求头里添加 `authorization` 字段，这里我们使用在上一步中创建的 `Bob` 的手机号码，这样我们就作为`Bob`登录了：

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

### 解析器工厂

接下来，我们将添加与猫咪相关的业务逻辑。

我们使用[解析器工厂](./schema/drizzle#解析器工厂)来快速创建接口：

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

在上面的代码中，我们使用 `drizzleResolverFactory()` 创建了 `catResolverFactory`，用于快速构建解析器。

我们添加了一个使用 `catResolverFactory` 创建了一个选取数据的查询 ，并将它命名为 `cats`，这个查询将提供完全的对 `cats` 表的查询操作。  
此外，我们还为猫咪添加了额外的 `age` 字段，用以获取猫咪的年龄。

接下来，让我们尝试添加一个 `createCat` 的变更。我们希望只有登录用户能访问这个接口，并且被创建的猫咪将归属于当前用户:

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

在上面的代码中，我们使用 `catResolverFactory` 创建了一个向 `cats` 表格添加更多数据的变更，并且我们重写了这个变更的输入。在验证输入时，我们使用 `useCurrentUser()` 获取当前登录用户的 ID，并将作为 `ownerId` 的值传递给 `cats` 表格。

现在让我们在演练场尝试添加几只猫咪:

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

让我们使用 `cats` 查询再确认一下数据库的数据：

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

### 关联对象

我们希望在查询猫咪的时候可以获取到猫咪的拥有者，并且在查询用户的时候也可以获取到他所有的猫咪。  
这在 GraphQL 中非常容易实现。  
让我们为 `cats` 添加额外的 `owner` 字段，并为 `users` 添加额外的 `cats` 字段：

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

在上面的代码中，我们使用解析器工厂为 `cats` 创建了 `owner` 字段；同样地，我们还为 `users` 创建了 `cats` 字段。  
在幕后，解析器工厂创建的关系字段将使用 `DataLoader` 从数据库查询以避免 N+1 问题。

让我们在演练场尝试一下查询猫的所有者：
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

让我们尝试一下查询当前用户的猫咪：

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

## 总结

在本篇文章中，我们创建了一个简单的 GraphQL 服务端应用。我们使用了以下工具：

- `Valibot` 或者 `Zod`: 用于定义和验证输入；
- `Drizzle`: 用于操作数据库，并且直接使用 `Drizzle` 表格作为 `GraphQL` 输出类型；
- 上下文: 用于在程序的不同部分之间共享数据，这对于实现登录、追踪日志等场景非常有用；
- 解析器工厂: 用于快速创建解析器和操作；
- `GraphQL Yoga`: 用于创建 GraphQL HTTP 服务，并且提供了 GraphiQL 演练场；

我们的应用实现了添加和查询 `users` 和 `cats` 的功能，但限于篇幅没有实现更新和删除功能，可以通过解析器工厂来快速添加。

## 下一步

- 查看 GQLoom 的核心概念：[丝线](./silk)、[解析器](./resolver)、[编织](./weave)；
- 了解常用功能：[上下文](./context)、[DataLoader](./dataloader)、[中间件](./middleware)
- 为前端项目添加 GraphQL 客户端：[gql.tada](https://gql-tada.0no.co/)、[Urql](https://commerce.nearform.com/open-source/urql/)、[Apollo Client](https://www.apollographql.com/docs/react)、[TanStack Query](https://tanstack.com/query/latest/docs/framework/react/graphql)、[Graffle](https://graffle.js.org/)