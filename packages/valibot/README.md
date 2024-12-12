![GQLoom Logo](https://github.com/modevol-com/gqloom/blob/main/gqloom.svg?raw=true)

# GQLoom

GQLoom is a GraphQL weaver for TypeScript/JavaScript that weaves GraphQL Schema using Valibot, Zod, or Yup, and supports sophisticated type inference to provide the best development experience.

# @gqloom/valibot

This package provides GQLoom integration with [Valibot](https://valibot.dev/) to weave Valibot Schema to GraphQL Schema.

## Hello World

```ts
import { resolver, query, ValibotWeaver } from "@gqloom/valibot"
import * as v from "valibot"

const helloResolver = resolver({
  hello: query(v.string(), () => "world"),
})

export const schema = ValibotWeaver.weave(helloResolver)
```

Read more at [GQLoom Document](https://gqloom.dev/guide/schema-integration/valibot).
