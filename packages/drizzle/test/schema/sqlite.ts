import { sql } from "drizzle-orm"
import { int, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { drizzleSilk } from "../../src"

export const users = drizzleSilk(
  sqliteTable("users", {
    id: int().primaryKey({ autoIncrement: true }),
    name: text().notNull(),
    age: int(),
    email: text(),
  }),
  {
    name: "User",
    description: "A user",
    fields: {
      name: { description: "The name of the user" },
      age: { description: "The age of the user" },
      email: { description: "The email of the user" },
    },
  }
)

export const posts = drizzleSilk(
  sqliteTable("posts", {
    id: int().primaryKey({ autoIncrement: true }),
    title: text().notNull(),
    content: text(),
    authorId: int().references(() => users.id, { onDelete: "cascade" }),
    reviewerId: int().references(() => users.id, { onDelete: "cascade" }),
  }),
  { name: "Post" }
)

export const userStarPosts = sqliteTable(
  "userStarPosts",
  {
    userId: int().references(() => users.id),
    postId: int().references(() => posts.id),
  },
  (t) => [primaryKey({ columns: [t.userId, t.postId] })]
)

export const courses = drizzleSilk(
  sqliteTable("courses", {
    id: int().primaryKey({ autoIncrement: true }),
    name: text().notNull(),
  })
)

export const studentToCourses = drizzleSilk(
  sqliteTable(
    "studentToCourses",
    {
      studentId: int().references(() => users.id),
      courseId: int().references(() => courses.id),
      createdAt: int({ mode: "timestamp" }).default(sql`(CURRENT_TIMESTAMP)`),
    },
    (t) => [primaryKey({ columns: [t.studentId, t.courseId] })]
  )
)

export const studentCourseGrades = drizzleSilk(
  sqliteTable("studentCourseGrades", {
    studentId: int().references(() => users.id),
    courseId: int().references(() => courses.id),
    grade: int(),
  })
)
