# GQLoom

GQLoom is a GraphQL weaver for TypeScript/JavaScript, using Zod, Yup, or Valibot to happily weave GraphQL schemas, providing the best development experience with complete type inference.

GQLoom is inspired by [tRPC](https://trpc.io/), [TypeGraphQL](https://typegraphql.com/), and [Pothos](https://pothos-graphql.dev/).

## Features

- 📦 Use popular pattern libraries (Zod, Yup, Valibot) to build and validate GraphQL schemas.
- 🔒 Complete type safety, discover potential issues during compilation.
- 🧩 Classic middleware system: authentication, caching, logging, etc.
- 🪄 Accessible Context and DataLoader everywhere.
- 🔮 No code generation and experimental decorator features.

## Hello, World!

```ts
import { weave } from "@gqloom/core"
import { resolver, query } from "@gqloom/valibot"
import * as v from "valibot"

const helloResolver = resolver({
  hello: query(v.string(), () => "world"),
})

export const schema = weave(helloResolver)
```
