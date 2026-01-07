![GQLoom Logo](https://github.com/modevol-com/gqloom/blob/main/gqloom.svg?raw=true)

# GQLoom

GQLoom is a **Code-First** GraphQL Schema Loom used to weave **runtime types** in the **TypeScript/JavaScript** ecosystem into GraphQL Schema, helping you build GraphQL server enjoyably and efficiently.

Runtime validation libraries such as [Zod](https://zod.dev/), [Valibot](https://valibot.dev/), and [Yup](https://github.com/jquense/yup) have been widely used in backend application development. Meanwhile, when using ORM libraries like [Prisma](https://www.prisma.io/), [MikroORM](https://mikro-orm.io/), and [Drizzle](https://orm.drizzle.team/), we also pre-define database table structures or entity models that contain runtime types.
The responsibility of GQLoom is to weave these runtime types into a GraphQL Schema.

When developing backend applications with GQLoom, you only need to write types using the Schema libraries you're familiar with. Modern Schema libraries will infer TypeScript types for you, and GQLoom will weave GraphQL types for you.
In addition, the **resolver factory** of GQLoom can create CRUD interfaces for `Prisma`, `MikroORM`, and `Drizzle`, and supports custom input and adding middleware.

## Effect

[Effect](https://effect.website/) is a powerful TypeScript library for building robust, scalable applications. It provides a comprehensive ecosystem including Effect Schema, which offers type-safe schema validation and transformation with excellent TypeScript inference. Effect Schema is designed with functional programming principles and provides a rich set of features for defining and validating data structures.

## @gqloom/effect

This package provides GQLoom integration with [Effect Schema](https://effect.website/docs/schema) to weave Effect Schema to GraphQL Schema.

### Installation

```bash
# use npm
npm install @gqloom/core @gqloom/effect effect

# use pnpm
pnpm add @gqloom/core @gqloom/effect effect

# use yarn
yarn add @gqloom/core @gqloom/effect effect
```

## Hello World

```ts
import { resolver, query, weave } from "@gqloom/core"
import { EffectWeaver } from "@gqloom/effect"
import { Schema } from "effect"

const standard = Schema.standardSchemaV1

const helloResolver = resolver({
  hello: query(standard(Schema.String))
    .input({ name: standard(Schema.NullOr(Schema.String)) })
    .resolve(({ name }) => `Hello, ${name ?? "World"}!`),
})

export const schema = weave(EffectWeaver, helloResolver)
```

Read more at [GQLoom Document](https://gqloom.dev/docs/schema/effect).

