![GQLoom Logo](https://github.com/modevol-com/gqloom/blob/main/gqloom.svg?raw=true)

# GQLoom

GQLoom is a GraphQL weaver for TypeScript/JavaScript that weaves GraphQL Schema using Valibot, Zod, or Yup, and supports sophisticated type inference to provide the best development experience.

The design of GQLoom is inspired by [tRPC](https://trpc.io/), [TypeGraphQL](https://typegraphql.com/), [Pothos](https://pothos-graphql.dev/).

## Features

* 🚀 GraphQL: flexible and efficient, reducing redundant data transfers;
* 🔒 Robust type safety: enjoy intelligent hints at development time to detect potential problems at compile time;
* 🔋 Ready to go: middleware, contexts, subscriptions, federated graphs are ready to go;
* 🔮 No extra magic: no decorators, no metadata and reflection, no code generation, you just need JavaScript/TypeScript;
* 🧩 Familiar schema libraries: use the schema libraries you already know (Zod, Yup, Valibot) to build GraphQL Schema and validate inputs;
* 🧑‍💻 Develop happily: highly readable and semantic APIs designed to keep your code tidy;

## Hello World

```ts
import { resolver, query, ValibotWeaver } from "@gqloom/valibot"
import * as v from "valibot"

const helloResolver = resolver({
  hello: query(v.string(), () => "world"),
})

export const schema = ValibotWeaver.weave(helloResolver)
```

Read [Introduction](https://gqloom.dev/guide/introduction.html) to learn more about GQLoom.

## Getting Started

See [Getting Started](https://gqloom.dev/guide/getting-started.html) to learn how to use GQLoom.
