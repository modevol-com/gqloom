import * as dotenv from "dotenv"

dotenv.config({ path: new URL("./.env", import.meta.url) })

export const config = {
  mysqlUrl: process.env.MYSQL_URL ?? "mysql://root@localhost:3306/mysql",
  postgresUrl:
    process.env.POSTGRESQL_URL ?? "postgres://postgres@localhost:5432/postgres",
}
