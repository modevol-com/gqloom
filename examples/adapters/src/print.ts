import * as fs from "fs"
import { weave } from "@gqloom/core"
import { lexicographicSortSchema, printSchema } from "graphql"
import { HelloResolver } from "./resolvers"

const schema = weave(HelloResolver)

const schemaText = printSchema(lexicographicSortSchema(schema))

if (process.env.NODE_ENV === "development") {
  fs.writeFileSync("schema.graphql", schemaText)
}
