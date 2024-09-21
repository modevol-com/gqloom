import { weave } from "@gqloom/core"
import { printSchema, lexicographicSortSchema } from "graphql"
import { HelloResolver } from "./resolvers"
import * as fs from "fs"

const schema = weave(HelloResolver)

const schemaText = printSchema(lexicographicSortSchema(schema))

if (process.env.NODE_ENV === "development") {
  fs.writeFileSync("schema.graphql", schemaText)
}
