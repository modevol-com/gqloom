<Tabs groupId="drizzle-api-version">
<template #v2_(rc)>

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

</template>
<template #v1>

```ts twoslash
// @paths: {"@gqloom/drizzle":["node_modules/@gqloom/drizzle-rqbv1/dist/index.d.ts"],"@gqloom/drizzle/context":["node_modules/@gqloom/drizzle-rqbv1/dist/context.d.ts"],"drizzle-orm":["node_modules/drizzle-orm-rqbv1/index.d.ts"],"drizzle-orm/sqlite-core":["node_modules/drizzle-orm-rqbv1/sqlite-core/index.d.ts"],"drizzle-orm/libsql":["node_modules/drizzle-orm-rqbv1/libsql/index.d.ts"]}
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

</template>
</Tabs>
