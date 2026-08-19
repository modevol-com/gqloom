```ts twoslash
import { extractExtendedColumnType } from "drizzle-orm"
import { GraphQLDateTime, GraphQLJSON } from "graphql-scalars"
import { DrizzleWeaver } from "@gqloom/drizzle"

const drizzleWeaverConfig = DrizzleWeaver.config({
  presetGraphQLType: (column) => {
    const { constraint } = extractExtendedColumnType(column)
    if (constraint === "date") {
      return GraphQLDateTime
    }
    if (constraint === "json") {
      return GraphQLJSON
    }
  },
})
```
