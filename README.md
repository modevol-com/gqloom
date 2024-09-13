# GQLoom

English | [简体中文](./README.zh-CN.md)

GQLoom is a GraphQL weaver for TypeScript/JavaScript that delightedly weaves GraphQL Schema using Zod, Yup, or Valibot, with fully support for automatic type-safety to provide the best development experience.

The design of GQLoom is inspired by [tRPC](https://trpc.io/), [TypeGraphQL](https://typegraphql.com/), [Pothos](https://pothos-graphql.dev/).

## Features

- 📦 Build GraphQL Schema and validate inputs using popular schema libraries (Zod, Yup, Valibot).
- 🛡️ Well-formed type safety to find potential problems at compile time.
- 🧩 Classic middleware systems: authentication, caching, logging, etc.
- 🪄 Context and DataLoader everywhere.
- 🔮 No code generation and experimental decorator features.

## Hello World

```ts
import { resolver, query, weave } from "@gqloom/valibot"
import * as v from "valibot"

const HelloResolver = resolver({
  hello: query(v.string(), () => "world"),
})

export const schema = weave(HelloResolver)
```
