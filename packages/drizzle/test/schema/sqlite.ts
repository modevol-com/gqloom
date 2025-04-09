import { sql } from "drizzle-orm"
import * as t from "drizzle-orm/sqlite-core"
import { drizzleSilk } from "../../src"

export const users = drizzleSilk(
  t.sqliteTable("users", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    age: t.int(),
    email: t.text(),
  })
)

export const posts = drizzleSilk(
  t.sqliteTable("posts", {
    id: t.int().primaryKey({ autoIncrement: true }),
    title: t.text().notNull(),
    content: t.text(),
    authorId: t.int().references(() => users.id, { onDelete: "cascade" }),
  })
)

export const courses = drizzleSilk(
  t.sqliteTable("courses", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
  })
)

export const studentToCourses = drizzleSilk(
  t.sqliteTable("studentToCourses", {
    studentId: t.int().references(() => users.id),
    courseId: t.int().references(() => courses.id),
    createdAt: t.int({ mode: "timestamp" }).default(sql`(CURRENT_TIMESTAMP)`),
  })
)

export const studentCourseGrades = drizzleSilk(
  t.sqliteTable("studentCourseGrades", {
    studentId: t.int().references(() => users.id),
    courseId: t.int().references(() => courses.id),
    grade: t.int(),
  })
)
