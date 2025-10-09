import { weave } from "@gqloom/core"
import * as fs from "fs"
import { lexicographicSortSchema, printSchema } from "graphql"
import { helloResolver } from "./resolvers"

const schema = weave(helloResolver)

const schemaText = printSchema(lexicographicSortSchema(schema))

if (process.env.NODE_ENV === "development") {
  fs.writeFileSync("schema.graphql", schemaText)
}
