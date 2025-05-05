import { field, query, resolver, silk, weave } from "@gqloom/core"
import { asyncContextProvider } from "@gqloom/core/context"
import { sql } from "drizzle-orm"
import { drizzle as sqliteDrizzle } from "drizzle-orm/libsql"
import { GraphQLString } from "graphql"
import { execute, parse } from "graphql"
import { afterEach, beforeAll, describe, expect, it } from "vitest"
import { useSelectedColumns } from "../src/context"
import { user } from "./schema/sqlite"

describe("useSelectedColumns", () => {
  const selectedColumns = new Set<string>()
  const db = sqliteDrizzle(":memory:")
  const r = resolver.of(user, {
    users: query(user.$list()).resolve((_input) => {
      for (const column of Object.keys(useSelectedColumns(user))) {
        selectedColumns.add(column)
      }
      return db.select().from(user)
    }),

    greeting: field(silk(GraphQLString))
      .derivedFrom("name")
      .resolve((user) => `Hello ${user.name}`),
  })

  const schema = weave(asyncContextProvider, r)

  beforeAll(async () => {
    await db.run(sql`-- 用户表
      CREATE TABLE user (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          age INTEGER,
          email TEXT
      );
      
      -- 帖子表
      CREATE TABLE post (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          content TEXT,
          authorId INTEGER,
          FOREIGN KEY (authorId) REFERENCES user(id) ON DELETE CASCADE
      );
      
      -- 课程表
      CREATE TABLE course (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL
      );
      
      -- 学生课程关联表
      CREATE TABLE studentToCourse (
          studentId INTEGER,
          courseId INTEGER,
          createdAt INTEGER DEFAULT (CURRENT_TIMESTAMP),
          FOREIGN KEY (studentId) REFERENCES user(id),
          FOREIGN KEY (courseId) REFERENCES course(id)
      );
      
      -- 学生课程成绩表
      CREATE TABLE studentCourseGrade (
          studentId INTEGER,
          courseId INTEGER,
          grade INTEGER,
          FOREIGN KEY (studentId) REFERENCES user(id),
          FOREIGN KEY (courseId) REFERENCES course(id)
      );`)
  })

  afterEach(async () => {
    await db.delete(user)
  })

  it("should return the selected columns", async () => {
    const query = parse(/* GraphQL */ `
      query {
        users { 
          id
          name
        }
      }
    `)
    await db.insert(user).values({ id: 1, name: "John" })
    const result = await execute({ schema, document: query })
    expect(selectedColumns).toEqual(new Set(["id", "name"]))
    expect(result.data?.users).toEqual([{ id: 1, name: "John" }])
  })

  it("should return the selected columns with derived fields", async () => {
    const query = parse(/* GraphQL */ `
      query {
        users { 
          id
          greeting
        }
      }
    `)
    await db.insert(user).values({ id: 1, name: "John" })
    const result = await execute({ schema, document: query })
    expect(result.data?.users).toEqual([{ id: 1, greeting: "Hello John" }])
  })
})
