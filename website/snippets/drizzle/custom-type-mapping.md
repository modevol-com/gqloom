<Tabs groupId="drizzle-api-version">
<template #v2_(rc)>

```ts
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
