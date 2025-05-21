import { defineConfig } from "drizzle-kit"

export default defineConfig({
  dialect: "sqlite",
  schema: "./test/schema/sqlite.ts",
  dbCredentials: {
    url: "file:./test/schema/sqlite-1.db",
  },
  tablesFilter: [
    "user",
    "post",
    "course",
    "studentToCourse",
    "studentCourseGrade",
    "studentCourseGrade",
  ],
})
