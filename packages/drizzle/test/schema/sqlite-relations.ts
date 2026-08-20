import { defineRelations } from "drizzle-orm"
import * as schema from "./sqlite"

export const relations = defineRelations(schema, (r) => ({
  users: {
    posts: r.many.posts({ alias: "author" }),
    reviewedPosts: r.many.posts({ alias: "reviewer" }),
    courses: r.many.studentToCourses(),
    starredPosts: r.many.userStarPosts(),
  },
  posts: {
    author: r.one.users({
      from: r.posts.authorId,
      to: r.users.id,
      alias: "author",
    }),
    reviewer: r.one.users({
      from: r.posts.reviewerId,
      to: r.users.id,
      alias: "reviewer",
    }),
    starredBy: r.many.userStarPosts({
      from: r.posts.id,
      to: r.userStarPosts.postId,
      alias: "starredBy",
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
  userStarPosts: {
    user: r.one.users({
      from: r.userStarPosts.userId,
      to: r.users.id,
    }),
    post: r.one.posts({
      from: r.userStarPosts.postId,
      to: r.posts.id,
    }),
  },
}))
