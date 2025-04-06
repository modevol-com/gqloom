import { sql } from "drizzle-orm"
import * as t from "drizzle-orm/sqlite-core"
import { drizzleSilk } from "../../src"

export const user = drizzleSilk(
  t.sqliteTable("user", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    age: t.int(),
    email: t.text(),
  })
)

export const post = drizzleSilk(
  t.sqliteTable("post", {
    id: t.int().primaryKey({ autoIncrement: true }),
    title: t.text().notNull(),
    content: t.text(),
    authorId: t.int().references(() => user.id, { onDelete: "cascade" }),
  })
)

export const course = drizzleSilk(
  t.sqliteTable("course", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
  })
)

export const studentToCourse = drizzleSilk(
  t.sqliteTable("studentToCourse", {
    studentId: t.int().references(() => user.id),
    courseId: t.int().references(() => course.id),
    createdAt: t.int({ mode: "timestamp" }).default(sql`(CURRENT_TIMESTAMP)`),
  })
)

export const studentCourseGrade = drizzleSilk(
  t.sqliteTable("studentCourseGrade", {
    studentId: t.int().references(() => user.id),
    courseId: t.int().references(() => course.id),
    grade: t.int(),
  })
)
