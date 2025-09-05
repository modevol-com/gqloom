import { writeFileSync } from "node:fs"
import { createServer } from "node:http"
import path from "node:path"
import { weave } from "@gqloom/core"
import { asyncContextProvider } from "@gqloom/core/context"
import { ValibotWeaver } from "@gqloom/valibot"
import { printSchema } from "graphql"
import { createYoga } from "graphql-yoga"
import { userResolver } from "./resolver"

const schema = weave(asyncContextProvider, ValibotWeaver, userResolver)
writeFileSync(path.join(__dirname, "schema.graphql"), printSchema(schema))
const yoga = createYoga({ schema })
const server = createServer(yoga)
server.listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
