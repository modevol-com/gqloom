import "dotenv/config"
import { defineConfig } from "drizzle-kit"

export default defineConfig({
  dialect: "mysql",
  schema: "./test/schema/mysql.ts",
  dbCredentials: {
    url: process.env.MYSQL_URL ?? "mysql://root@localhost:3306/mysql",
  },
  tablesFilter: ["drizzle_*"],
})
