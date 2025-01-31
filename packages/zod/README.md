![GQLoom Logo](https://github.com/modevol-com/gqloom/blob/main/gqloom.svg?raw=true)

# GQLoom

GQLoom is a GraphQL weaver for TypeScript/JavaScript that weaves GraphQL Schema using Valibot, Zod, or Yup, and supports sophisticated type inference to provide the best development experience.

# @gqloom/zod

This package provides GQLoom integration with [Zod](https://zod.dev/) to weave Zod Schema to GraphQL Schema.

## Hello World

```ts
import { resolver, query, ZodWeaver } from "@gqloom/zod"
import { zod } from "zod"

const helloResolver = resolver({
  hello: query(z.string(), () => "world"),
})

export const schema = ZodWeaver.weave(helloResolver)
```

Read more at [GQLoom Document](https://gqloom.dev/guide/schema-integration/zod).
