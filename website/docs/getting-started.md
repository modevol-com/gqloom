<script setup>
import { Tabs } from "@/components/tabs.tsx"
</script>

# Getting Started

This guide will help you get started with GQLoom and create a simple GraphQL backend application.

## Prerequisites

You only need a JavaScript/TypeScript runtime, such as Node.js, Bun, Deno, or Cloudflare Workers.

## Initialize the project

:::: tip Tip
If you already have a project, you can skip this step and jump straight to [Installation](#installation).
::::

First, create a new folder and initialize the project:

:::: code-group
```sh [npm]
mkdir gqloom-app # Create a new folder
cd ./gqloom-app # Enter the folder
npm init -y # Initialize an empty project

npm i -D typescript @types/node tsx # Install TypeScript and related dependencies
npx tsc --init # Initialize TypeScript configuration
```

```sh [pnpm]
mkdir gqloom-app # Create a new folder
cd ./gqloom-app # Enter the folder
yarn init -y # Initialize an empty project

yarn add -D typescript @types/node tsx # Install TypeScript and related dependencies
yarn dlx -q -p typescript tsc --init # Initialize TypeScript configuration
```

```sh [yarn]
mkdir gqloom-app # Create a new folder
cd ./gqloom-app # Enter the folder
pnpm init # Initialize an empty project

pnpm add -D typescript @types/node tsx # Install TypeScript and related dependencies
pnpm exec tsc --init # Initialize TypeScript configuration
```

```sh [bun]
mkdir gqloom-app # Create a new folder
cd ./gqloom-app # Enter the folder
bun init # Initialize the project
```

```sh [deno]
mkdir gqloom-app # Create a new folder
cd ./gqloom-app # Enter the folder
deno init # Initialize the project
```
::::

## Installation

GQLoom supports multiple runtime types; choose your favorite ORM and validation library!

<Tabs groupId="favorite-orm-and-validation-library">
<template #Valibot>

<!--@include: ../snippets/install-valibot.md-->

</template>
<template #Zod>

<!--@include: ../snippets/install-zod.md-->

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

<!--@include: ../snippets/install-yup.md-->

</template>
<template #Effect_Schema>

<!--@include: ../snippets/install-effect.md-->

</template>
<template #JSON_Schema>

<!--@include: ../snippets/install-json-schema.md-->

</template>
<template #graphql.js>

:::: code-group
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
::::

</template>
<template #TypeBox>

<!--@include: ../snippets/install-typebox.md-->

</template>
<template #ArkType>

:::: code-group
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
::::

</template>
</Tabs>

In addition, we need to choose an [adapter](./advanced/adapters/) to run our GraphQL server.  
Here we choose the [graphql-yoga](https://the-guild.dev/graphql/yoga-server) adapter.

<!--@include: ../snippets/install-yoga.md-->

## Hello, World

<Tabs groupId="favorite-orm-and-validation-library">
<template #Valibot>

<<< @/snippets/code/hello-valibot.ts{ts twoslash}

</template>
<template #Zod>

<<< @/snippets/code/hello-zod.ts{ts twoslash}

</template>
<template #MikroORM>

In GQLoom, the easiest way to use `MikroORM` is the [resolver factory](./schema/mikro-orm#resolver-factory),  
with just a few lines you can create a GraphQL app with full CRUD:

<!--@include: @/snippets/home/mikro.md-->

We can also build resolvers from `MikroORM` entities:

<<< @/snippets/home/mikro/resolver.ts{ts twoslash}

</template>
<template #Drizzle>

In GQLoom, the easiest way to use `Drizzle` is the [resolver factory](./schema/drizzle#resolver-factory),  
with just a few lines you can create a GraphQL app with full CRUD:

<!--@include: @/snippets/home/drizzle.md-->

We can also build resolvers from `Drizzle` tables:

<<< @/snippets/home/drizzle/resolver.ts{ts twoslash}

</template>
<template #Prisma>

In GQLoom, the easiest way to use `Prisma` is the [resolver factory](./schema/prisma#resolver-factory),  
with just a few lines you can create a GraphQL app with full CRUD:

<!--@include: @/snippets/home/prisma.md-->

We can also build resolvers from `Prisma` models:

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
<template #Effect_Schema>

<<< @/snippets/code/hello-effect.ts{ts twoslash}

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
</Tabs>

## Next steps

- Learn GQLoom's core concepts: [Silk](./silk), [Resolver](./resolver), [Weave](./weave);
- Learn common features: [Context](./context), [DataLoader](./dataloader), [Middleware](./middleware)
- Add a GraphQL client to your frontend project: [gql.tada](https://gql-tada.0no.co/), [Urql](https://commerce.nearform.com/open-source/urql/), [Apollo Client](https://www.apollographql.com/docs/react), [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/graphql), [Graffle](https://graffle.js.org/)