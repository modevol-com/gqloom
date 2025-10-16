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
<template #MikroORM>

<!--@include: ../snippets/install-mikro.md-->

</template>
<template #Drizzle>

<!--@include: ../snippets/install-drizzle.md-->

</template>
<template #Prisma>

<!--@include: ../snippets/install-prisma.md-->

</template>
<template #Valibot>

<!--@include: ../snippets/install-valibot.md-->

</template>
<template #Zod>

<!--@include: ../snippets/install-zod.md-->

</template>
<template #Yup>

<!--@include: ../snippets/install-yup.md-->

</template>
<template #JSON_Schema>

</template>
<template #graphql.js>

</template>
<template #TypeBox>

</template>
<template #ArkType>

</template>
<template #Effect_Schema>

</template>
</Tabs>

## 你好，世界

<Tabs groupId="favorite-orm-and-validation-library">
<template #MikroORM>

</template>
<template #Drizzle>

</template>
<template #Prisma>

</template>
<template #Valibot>

</template>
<template #Zod>

</template>
<template #Yup>

</template>
<template #JSON_Schema>

</template>
<template #graphql.js>

</template>
<template #TypeBox>

</template>
<template #ArkType>

</template>
<template #Effect_Schema>

</template>
</Tabs>