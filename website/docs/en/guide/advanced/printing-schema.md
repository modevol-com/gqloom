# Printing Schema

One of the powerful points of GraphQL is that GraphQL Schema can be used to describe all the APIs on the server side.

## Generating files from Schema

We can use the `printSchema` function from the `graphql` package to print out the Schema.

```ts
import { weave } from "@gqloom/core"
import { printSchema, lexicographicSortSchema } from "graphql"
import { HelloResolver } from "./resolvers"
import * as fs from "fs"

const schema = weave(HelloResolver)

const schemaText = printSchema(lexicographicSortSchema(schema))

if (process.env.NODE_ENV === "development") {
  fs.writeFileSync("schema.graphql", schemaText)
}
```

The above code generates a `schema.graphql` file that contains all the contents of the Schema.

## Using GraphQL Schema

GraphQL Schema can be used for many purposes, common uses include:

- Merging Schema from multiple microservices into a [supergraph](https://www.apollographql.com/docs/federation/building-supergraphs/subgraphs-overview) for unified cross-service querying on the client side. This architecture is called [federation](./federation.mdx).

- Developed and type-checked on the client side using [code generation](https://the-guild.dev/graphql/codegen).

- Integrate with TypeScript for client-side development for better type checking and auto-completion during development, see [gql.tada](https://gql-tada.0no.co/) for more information.
