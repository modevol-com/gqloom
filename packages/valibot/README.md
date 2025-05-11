![GQLoom Logo](https://github.com/modevol-com/gqloom/blob/main/gqloom.svg?raw=true)

# GQLoom

GQLoom is a **Code-First** GraphQL Schema Loom used to weave **runtime types** in the **TypeScript/JavaScript** ecosystem into GraphQL Schema, helping you build GraphQL server enjoyably and efficiently.

Runtime validation libraries such as [Zod](https://zod.dev/), [Valibot](https://valibot.dev/), and [Yup](https://github.com/jquense/yup) have been widely used in backend application development. Meanwhile, when using ORM libraries like [Prisma](https://www.prisma.io/), [MikroORM](https://mikro-orm.io/), and [Drizzle](https://orm.drizzle.team/), we also pre-define database table structures or entity models that contain runtime types.
The responsibility of GQLoom is to weave these runtime types into a GraphQL Schema.

When developing backend applications with GQLoom, you only need to write types using the Schema libraries you're familiar with. Modern Schema libraries will infer TypeScript types for you, and GQLoom will weave GraphQL types for you.
In addition, the **resolver factory** of GQLoom can create CRUD interfaces for `Prisma`, `MikroORM`, and `Drizzle`, and supports custom input and adding middleware.

# @gqloom/valibot

This package provides GQLoom integration with [Valibot](https://valibot.dev/) to weave Valibot Schema to GraphQL Schema.

## Installation

```bash
# use npm
npm i @gqloom/core valibot @gqloom/valibot

# use pnpm
pnpm add @gqloom/core valibot @gqloom/valibot

# use yarn
yarn add @gqloom/core valibot @gqloom/valibot
```


## Hello World

```ts
import { resolver, query, weave } from "@gqloom/core"
import { ValibotWeaver } from "@gqloom/valibot"
import * as v from "valibot"

const helloResolver = resolver({
  hello: query(v.string())
    .input({ name: v.nullish(v.string(), "World") })
    .resolve(({ name }) => `Hello, ${name}!`),
})

export const schema = weave(ValibotWeaver, helloResolver)
```

Read more at [GQLoom Document](https://gqloom.dev/docs/schema/valibot).
