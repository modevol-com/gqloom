import { relations, sql } from "drizzle-orm"
import * as t from "drizzle-orm/sqlite-core"
import { drizzleSilk } from "../../src"

export const user = drizzleSilk(
  t.sqliteTable("user", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    age: t.int(),
    email: t.text(),
  }),
  {
    description: "A user",
    fields: {
      name: { description: "The name of the user" },
      age: { description: "The age of the user" },
      email: { description: "The email of the user" },
    },
  }
)

export const usersRelations = relations(user, ({ many }) => ({
  posts: many(post),
  courses: many(studentToCourse),
}))

export const post = drizzleSilk(
  t.sqliteTable("post", {
    id: t.int().primaryKey({ autoIncrement: true }),
    title: t.text().notNull(),
    content: t.text(),
    authorId: t.int().references(() => user.id, { onDelete: "cascade" }),
  })
)

export const postsRelations = relations(post, ({ one }) => ({
  author: one(user, {
    fields: [post.authorId],
    references: [user.id],
  }),
}))

export const course = drizzleSilk(
  t.sqliteTable("course", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
  })
)

export const coursesRelations = relations(course, ({ many }) => ({
  students: many(studentToCourse),
}))

export const studentToCourse = drizzleSilk(
  t.sqliteTable("studentToCourse", {
    studentId: t.int().references(() => user.id),
    courseId: t.int().references(() => course.id),
    createdAt: t.int({ mode: "timestamp" }).default(sql`(CURRENT_TIMESTAMP)`),
  })
)

export const studentToCourseRelations = relations(
  studentToCourse,
  ({ one }) => ({
    student: one(user, {
      fields: [studentToCourse.studentId],
      references: [user.id],
    }),
    course: one(course, {
      fields: [studentToCourse.courseId],
      references: [course.id],
    }),
    grade: one(studentCourseGrade, {
      fields: [studentToCourse.studentId, studentToCourse.courseId],
      references: [studentCourseGrade.studentId, studentCourseGrade.courseId],
    }),
  })
)

export const studentCourseGrade = drizzleSilk(
  t.sqliteTable("studentCourseGrade", {
    studentId: t.int().references(() => user.id),
    courseId: t.int().references(() => course.id),
    grade: t.int(),
  })
)
