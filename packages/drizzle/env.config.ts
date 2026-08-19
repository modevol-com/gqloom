import * as dotenv from "dotenv"

dotenv.config({ path: new URL("./.env", import.meta.url) })

export const config = {
  mysqlUrl: process.env.MYSQL_URL ?? "",
  postgresUrl: process.env.POSTGRESQL_URL ?? "",
}
