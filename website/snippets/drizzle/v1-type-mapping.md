```ts
import { GraphQLDateTime, GraphQLJSON } from "graphql-scalars"
import { DrizzleWeaver } from "@gqloom/drizzle"

const drizzleWeaverConfig = DrizzleWeaver.config({
  presetGraphQLType: (column) => {
    if (column.dataType === "date") {
      return GraphQLDateTime
    }
    if (column.dataType === "json") {
      return GraphQLJSON
    }
  },
})
```
