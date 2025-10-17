<script setup>
import { Tabs } from "@/components/tabs.tsx"
</script>

# 快速上手

这篇指南将带你快速上手 GQLoom，并创建一个简单的 GraphQL 后端应用。

## 前提条件

你只需要一个 JavaScript/TypeScript 运行时，比如 Node.js、Bun、Deno 或 Cloudflare Workers。

## 初始化项目

::: tip 小提示
如果你已有一个项目，可以跳过这一步，直接快进到[安装依赖](#安装依赖)。
:::

首先我们需要新建文件夹并初始化项目：

::: code-group
```sh [npm]
mkdir gqloom-app # 新建文件夹
cd ./gqloom-app # 进入文件夹
npm init -y # 初始化空项目

npm i -D typescript @types/node tsx # 安装 TypeScript 和相关依赖
npx tsc --init # 初始化 TypeScript 配置
```

```sh [pnpm]
mkdir gqloom-app # 新建文件夹
cd ./gqloom-app # 进入文件夹
yarn init -y # 初始化空项目

yarn add -D typescript @types/node tsx # 安装 TypeScript 和相关依赖
yarn dlx -q -p typescript tsc --init # 初始化 TypeScript 配置
```

```sh [yarn]
mkdir gqloom-app # 新建文件夹
cd ./gqloom-app # 进入文件夹
pnpm init # 初始化空项目

pnpm add -D typescript @types/node tsx # 安装 TypeScript 和相关依赖
pnpm exec tsc --init # 初始化 TypeScript 配置
```

```sh [bun]
mkdir gqloom-app # 新建文件夹
cd ./gqloom-app # 进入文件夹
bun init # 初始化项目
```

```sh [deno]
mkdir gqloom-app # 新建文件夹
cd ./gqloom-app # 进入文件夹
deno init # 初始化项目
```
:::

## 安装依赖

GQLoom 支持诸多的运行时类型，选择你最喜欢的 ORM 和输入验证库！

<Tabs groupId="favorite-orm-and-validation-library">
<template #Valibot>

<!--@include: @/snippets/install-valibot.md-->

</template>
<template #Zod>

<!--@include: @/snippets/install-zod.md-->

</template>
<template #MikroORM>

<!--@include: ../snippets/install-mikro.md-->

</template>
<template #Drizzle>

<!--@include: ../snippets/install-drizzle.md-->

</template>
<template #Prisma>

<!--@include: ../snippets/install-prisma.md-->

</template>
<template #Yup>

<!--@include: @/snippets/install-yup.md-->

</template>
<template #JSON_Schema>

<!--@include: @/snippets/install-json-schema.md-->

</template>
<template #graphql.js>

::: code-group
```sh [npm]
npm i graphql @gqloom/core
```
```sh [pnpm]
pnpm add graphql @gqloom/core
```
```sh [yarn]
yarn add graphql @gqloom/core
```
```sh [bun]
bun add graphql @gqloom/core
```
```sh [deno]
deno add npm:graphql npm:@gqloom/core
```
:::

</template>
<template #TypeBox>

<!--@include: @/snippets/install-typebox.md-->

</template>
<template #ArkType>

::: code-group
```sh [npm]
npm i graphql @gqloom/core arktype @gqloom/json
```
```sh [pnpm]
pnpm add graphql @gqloom/core arktype @gqloom/json
```
```sh [yarn]
yarn add graphql @gqloom/core arktype @gqloom/json
```
```sh [bun]
bun add graphql @gqloom/core arktype @gqloom/json
```
```sh [deno]
deno add npm:graphql npm:@gqloom/core npm:arktype npm:@gqloom/json
```
:::

</template>
<template #Effect_Schema>

::: code-group
```sh [npm]
npm i graphql @gqloom/core effect @gqloom/json
```
```sh [pnpm]
pnpm add graphql @gqloom/core effect @gqloom/json
```
```sh [yarn]
yarn add graphql @gqloom/core effect @gqloom/json
```
```sh [bun]
bun add graphql @gqloom/core effect @gqloom/json
```
```sh [deno]
deno add npm:graphql npm:@gqloom/core npm:effect-schema npm:@gqloom/json
```
:::

</template>
</Tabs>

此外，我们还需要选择一个[适配器](./advanced/adapters/)来运行我们的 GraphQL 服务器。  
这里我们选择 [graphql-yoga](https://the-guild.dev/graphql/yoga-server) 适配器。

<!--@include: @/snippets/install-yoga.md-->

## 你好，世界

<Tabs groupId="favorite-orm-and-validation-library">
<template #Valibot>

<<< @/snippets/code/hello-valibot.ts{ts twoslash}

</template>
<template #Zod>

<<< @/snippets/code/hello-zod.ts{ts twoslash}

</template>
<template #MikroORM>

在 GQLoom 中，使用 `MikroORM` 的最简单的方法是使用[解析器工厂](./schema/mikro-orm#解析器工厂)，  
只需要几行代码就可以创建包含完整增删改查功能的 GraphQL 应用：

<!--@include: @/snippets/home/mikro.md-->

我们也可以使用 `MikroORM` 的实体建构解析器：

<<< @/snippets/home/mikro/resolver.ts{ts twoslash}

</template>
<template #Drizzle>

在 GQLoom 中，使用 `Drizzle` 的最简单的方法是使用[解析器工厂](./schema/drizzle#解析器工厂)，  
只需要几行代码就可以创建包含完整增删改查功能的 GraphQL 应用：

<!--@include: @/snippets/home/drizzle.md-->

我们也可以使用 `Drizzle` 的表建构解析器：

<<< @/snippets/home/drizzle/resolver.ts{ts twoslash}

</template>
<template #Prisma>

在 GQLoom 中，使用 `Prisma` 的最简单的方法是使用[解析器工厂](./schema/prisma#解析器工厂)，  
只需要几行代码就可以创建包含完整增删改查功能的 GraphQL 应用：

<!--@include: @/snippets/home/prisma.md-->

我们也可以使用 `Prisma` 的模型建构解析器：

```ts
import { field, query, resolver } from "@gqloom/core"
import * as v from "valibot"
import { Post, User } from "./generated/gqloom"

export const userResolver = resolver.of(User, {
  user: query(User.nullable())
    .input({ id: v.number() })
    .resolve(({ id }) => {
      return db.user.findUnique({ where: { id } })
    }),

  posts: field(Post.list())
    .derivedFrom("id")
    .resolve(async (users) => {
      return (
        (await db.user.findUnique({ where: { id: users.id } }).posts()) ?? []
      )
    }),
})
```

</template>
<template #Yup>

<<< @/snippets/code/hello-yup.ts{ts twoslash}

</template>
<template #JSON_Schema>

<<< @/snippets/code/hello-json.ts{ts twoslash}

</template>
<template #graphql.js>

<<< @/snippets/code/hello-graphql-js.ts{ts twoslash}

</template>
<template #TypeBox>

<<< @/snippets/code/hello-typebox.ts{ts twoslash}

</template>
<template #ArkType>

<<< @/snippets/code/hello-arktype.ts{ts twoslash}

</template>
<template #Effect_Schema>

<<< @/snippets/code/hello-effect.ts{ts twoslash}

</template>
</Tabs>

## 下一步

- 查看 GQLoom 的核心概念：[丝线](./silk)、[解析器](./resolver)、[编织](./weave)；
- 了解常用功能：[上下文](./context)、[DataLoader](./dataloader)、[中间件](./middleware)
- 为前端项目添加 GraphQL 客户端：[gql.tada](https://gql-tada.0no.co/)、[Urql](https://commerce.nearform.com/open-source/urql/)、[Apollo Client](https://www.apollographql.com/docs/react)、[TanStack Query](https://tanstack.com/query/latest/docs/framework/react/graphql)、[Graffle](https://graffle.js.org/)