import { defineRelations } from "drizzle-orm"
import * as schema from "./sqlite"

export const relations = defineRelations(schema, (r) => ({
  user: {
    posts: r.many.post(),
    courses: r.many.studentToCourse(),
  },
  post: {
    author: r.one.user({
      from: r.post.authorId,
      to: r.user.id,
    }),
  },
  course: {
    students: r.many.studentToCourse(),
  },
  studentToCourse: {
    student: r.one.user({
      from: r.studentToCourse.studentId,
      to: r.user.id,
    }),
    course: r.one.course({
      from: r.studentToCourse.courseId,
      to: r.course.id,
    }),
    grade: r.one.studentCourseGrade({
      from: [r.studentToCourse.studentId, r.studentToCourse.courseId],
      to: [r.studentCourseGrade.studentId, r.studentCourseGrade.courseId],
    }),
  },
}))
