import { defineRelations } from "drizzle-orm"
import * as schema from "./sqlite"

export const relations = defineRelations(schema, (r) => ({
  users: {
    posts: r.many.posts(),
    courses: r.many.studentToCourses(),
  },
  posts: {
    author: r.one.users({
      from: r.posts.authorId,
      to: r.users.id,
    }),
  },
  courses: {
    students: r.many.studentToCourses(),
  },
  studentToCourses: {
    student: r.one.users({
      from: r.studentToCourses.studentId,
      to: r.users.id,
    }),
    course: r.one.courses({
      from: r.studentToCourses.courseId,
      to: r.courses.id,
    }),
    grade: r.one.studentCourseGrades({
      from: [r.studentToCourses.studentId, r.studentToCourses.courseId],
      to: [r.studentCourseGrades.studentId, r.studentCourseGrades.courseId],
    }),
  },
}))
