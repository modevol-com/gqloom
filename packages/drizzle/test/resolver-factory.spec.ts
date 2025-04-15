import { eq, inArray, sql } from "drizzle-orm"
import {
  type LibSQLDatabase,
  drizzle as sqliteDrizzle,
} from "drizzle-orm/libsql"
import {
  type MySql2Database,
  drizzle as mysqlDrizzle,
} from "drizzle-orm/mysql2"
import {
  type NodePgDatabase,
  drizzle as pgDrizzle,
} from "drizzle-orm/node-postgres"
import * as sqlite from "drizzle-orm/sqlite-core"
import * as v from "valibot"
import { afterAll, beforeAll, describe, expect, expectTypeOf, it } from "vitest"
import { config } from "../env.config"
import {
  type DrizzleMySQLResolverFactory,
  type DrizzlePostgresResolverFactory,
  DrizzleResolverFactory,
  type DrizzleSQLiteResolverFactory,
  drizzleResolverFactory,
} from "../src"
import type {
  InferSelectArrayOptions,
  InferSelectSingleOptions,
} from "../src/factory/types"
import * as mysqlSchemas from "./schema/mysql"
import { relations as mysqlRelations } from "./schema/mysql-relations"
import * as pgSchemas from "./schema/postgres"
import { relations as pgRelations } from "./schema/postgres-relations"
import * as sqliteSchemas from "./schema/sqlite"
import { relations as sqliteRelations } from "./schema/sqlite-relations"

const pathToDB = new URL("./schema/sqlite.db", import.meta.url)

describe.concurrent("DrizzleResolverFactory", () => {
  let db: LibSQLDatabase<typeof sqliteSchemas, typeof sqliteRelations>
  let userFactory: DrizzleSQLiteResolverFactory<
    typeof db,
    typeof sqliteSchemas.users
  >

  beforeAll(async () => {
    db = sqliteDrizzle({
      schema: sqliteSchemas,
      relations: sqliteRelations,
      connection: { url: `file:${pathToDB.pathname}` },
    })

    userFactory = drizzleResolverFactory(db, "users")

    await db.insert(sqliteSchemas.users).values([
      {
        name: "John",
        age: 10,
        email: "john@example.com",
      },
      {
        name: "Jane",
        age: 11,
      },
      {
        name: "Jim",
        age: 12,
      },
      {
        name: "Joe",
        age: 13,
      },
      {
        name: "Jill",
        age: 14,
      },
    ] satisfies (typeof sqliteSchemas.users.$inferInsert)[])
  })

  afterAll(async () => {
    await db.delete(sqliteSchemas.users)
  })

  it("should create a resolver factory", () => {
    expect(userFactory).toBeInstanceOf(DrizzleResolverFactory)
  })

  it("should throw an error if the table is not found", () => {
    const unknownTable = sqlite.sqliteTable("unknown", {
      id: sqlite.integer("id").primaryKey(),
    })
    expect(() => drizzleResolverFactory(db, unknownTable)).toThrow(
      "GQLoom-Drizzle Error: Table unknown not found in drizzle instance. Did you forget to pass schema to drizzle constructor?"
    )
  })

  describe.concurrent("selectArrayQuery", () => {
    it("should be created without error", async () => {
      const query = userFactory.selectArrayQuery()
      expect(query).toBeDefined()
    })

    it("should resolve correctly with orderBy", async () => {
      const query = userFactory.selectArrayQuery()

      let answer
      answer = await query["~meta"].resolve({ orderBy: { age: "asc" } })
      expect(answer).toMatchObject([
        { age: 10 },
        { age: 11 },
        { age: 12 },
        { age: 13 },
        { age: 14 },
      ])

      answer = await query["~meta"].resolve({ orderBy: { age: "desc" } })
      expect(answer).toMatchObject([
        { age: 14 },
        { age: 13 },
        { age: 12 },
        { age: 11 },
        { age: 10 },
      ])
    })

    it("should resolve correctly with filters", async () => {
      const query = userFactory.selectArrayQuery()
      let answer
      answer = await query["~meta"].resolve({})
      expect(answer).toHaveLength(5)

      answer = await query["~meta"].resolve({
        where: { age: { gte: 12 } },
      })
      expect(answer).toMatchObject([{ age: 12 }, { age: 13 }, { age: 14 }])

      answer = await query["~meta"].resolve({
        where: { age: { lt: 12 } },
      })
      expect(answer).toMatchObject([{ age: 10 }, { age: 11 }])
      answer = await query["~meta"].resolve({
        where: { age: { gte: 12, lt: 13 } },
      })
      expect(answer).toMatchObject([{ age: 12 }])

      answer = await query["~meta"].resolve({
        where: { age: { in: [10, 11] } },
      })
      expect(new Set(answer)).toMatchObject(new Set([{ age: 10 }, { age: 11 }]))

      answer = await query["~meta"].resolve({
        where: { age: { notIn: [10, 11] } },
      })
      expect(new Set(answer)).toMatchObject(
        new Set([{ age: 12 }, { age: 13 }, { age: 14 }])
      )

      answer = await query["~meta"].resolve({
        where: { age: { OR: [{ eq: 10 }, { eq: 11 }] } },
      })
      expect(new Set(answer)).toMatchObject(new Set([{ age: 10 }, { age: 11 }]))

      answer = await query["~meta"].resolve({
        where: { OR: [{ age: { eq: 10 } }, { age: { eq: 11 } }] },
      })
      expect(new Set(answer)).toMatchObject(new Set([{ age: 10 }, { age: 11 }]))

      answer = await query["~meta"].resolve({
        where: { name: { like: "J%" } },
      })
      expect(answer).toHaveLength(5)

      answer = await query["~meta"].resolve({
        where: { age: { isNull: true } },
      })
      expect(answer).toHaveLength(0)
    })

    it("should be created with custom input", async () => {
      let query, answer
      query = userFactory.selectArrayQuery({
        input: v.pipe(
          v.object({
            age: v.nullish(v.number()),
          }),
          v.transform(({ age }) => ({
            where: age != null ? { age } : undefined,
          }))
        ),
      })

      expect(query).toBeDefined()
      answer = await query["~meta"].resolve({ age: 10 })
      expect(answer).toMatchObject([{ age: 10 }])

      query = userFactory
        .selectArrayQuery()
        .description("query with custom input")
        .input(
          v.pipe(
            v.object({
              age: v.nullish(v.number()),
            }),
            v.transform(({ age }) => ({
              where: age != null ? { age } : undefined,
            }))
          )
        )

      expect(query).toBeDefined()
      answer = await query["~meta"].resolve({ age: 10 })
      expect(answer).toMatchObject([{ age: 10 }])
    })

    it("should be created with middlewares", async () => {
      type SelectArrayOptions = InferSelectArrayOptions<
        typeof db,
        typeof sqliteSchemas.users
      >

      let count = 0

      const query = userFactory
        .selectArrayQuery({
          middlewares: [
            async ({ parseInput, next }) => {
              const opts = await parseInput()
              if (opts.issues) throw new Error("Invalid input")
              expectTypeOf(opts.value).toEqualTypeOf<
                NonNullable<SelectArrayOptions> | undefined
              >()
              count++
              const answer = await next()
              expectTypeOf(answer).toEqualTypeOf<
                (typeof sqliteSchemas.users.$inferSelect)[]
              >()
              return answer
            },
          ],
        })
        .use(async ({ parseInput, next }) => {
          const value = await parseInput.getResult()
          expectTypeOf(value).toEqualTypeOf<
            NonNullable<SelectArrayOptions> | undefined
          >()
          count++
          const answer = await next()
          expectTypeOf(answer).toEqualTypeOf<
            (typeof sqliteSchemas.users.$inferSelect)[]
          >()
          return answer
        })

      await query["~meta"].resolve({})
      expect(count).toBe(2)
    })

    it("should work with AND operators", async () => {
      const query = userFactory.selectArrayQuery()
      let answer
      answer = await query["~meta"].resolve({
        where: { AND: [{ name: { eq: "John" } }, { age: { gt: 10 } }] },
      })
      expect(answer).toHaveLength(0)

      answer = await query["~meta"].resolve({
        where: { AND: [{ name: { eq: "John" } }, { age: { gte: 10 } }] },
      })
      expect(answer).toHaveLength(1)
    })

    it("should work with OR operators", async () => {
      const query = userFactory.selectArrayQuery()
      let answer
      answer = await query["~meta"].resolve({
        where: { OR: [{ name: { eq: "John" } }, { age: { gt: 12 } }] },
      })
      expect(answer).toHaveLength(3)

      answer = await query["~meta"].resolve({
        where: { OR: [{ age: { gte: 14 } }, { age: { lte: 10 } }] },
      })
      expect(answer).toHaveLength(2)
    })

    it("should work with NOT operators", async () => {
      const query = userFactory.selectArrayQuery()
      let answer
      answer = await query["~meta"].resolve({
        where: { NOT: { name: { eq: "John" } } },
      })
      expect(answer).toHaveLength(4)

      answer = await query["~meta"].resolve({
        where: { NOT: { age: { lte: 10 } } },
      })
      expect(answer).toHaveLength(4)
    })

    it("should work with complex NOT conditions", async () => {
      const query = userFactory.selectArrayQuery()
      let answer

      // Test NOT with OR condition
      answer = await query["~meta"].resolve({
        where: {
          NOT: {
            OR: [{ name: { eq: "John" } }, { name: { eq: "Jane" } }],
          } as any,
        },
      })
      expect(answer).toHaveLength(3) // Should exclude both John and Jane

      // Test NOT with AND condition
      answer = await query["~meta"].resolve({
        where: {
          NOT: {
            AND: [{ age: { gte: 10 } }, { age: { lte: 12 } }],
          } as any,
        },
      })
      // Should exclude ages 10, 11, 12
      expect(answer.map((user) => user.age).sort()).toEqual([13, 14])

      // Test nested NOT conditions
      answer = await query["~meta"].resolve({
        where: {
          age: {
            NOT: {
              lte: 12,
            },
          },
        },
      })
      // Double negation: NOT(NOT(age > 12)) = age > 12
      expect(answer.map((user) => user.age).sort()).toEqual([13, 14])
    })

    it("should work with column-level NOT operator", async () => {
      const query = userFactory.selectArrayQuery()

      // Test NOT applied to a column filter
      const answer = await query["~meta"].resolve({
        where: {
          age: {
            NOT: { lte: 12 } as any,
          },
        },
      })

      // Should only include ages > 12
      expect(answer.map((user) => (user as any).age).sort()).toEqual([13, 14])
    })

    it("should work with column-level operators (OR, AND)", async () => {
      const query = userFactory.selectArrayQuery()
      let answer

      // Test column-level OR operator
      answer = await query["~meta"].resolve({
        where: { age: { OR: [{ eq: 10 }, { eq: 11 }] } },
      })
      expect(new Set(answer)).toMatchObject(new Set([{ age: 10 }, { age: 11 }]))

      // Test column-level AND operator
      answer = await query["~meta"].resolve({
        where: { age: { AND: [{ gte: 10 }, { lte: 11 }] } },
      })
      expect(new Set(answer)).toMatchObject(new Set([{ age: 10 }, { age: 11 }]))
    })
  })

  describe.concurrent("selectSingleQuery", () => {
    it("should be created without error", () => {
      const query = userFactory.selectSingleQuery()
      expect(query).toBeDefined()
    })

    it("should resolve correctly with orderBy", async () => {
      const query = userFactory.selectSingleQuery()
      expect(
        await query["~meta"].resolve({
          orderBy: { age: "asc" },
        })
      ).toMatchObject({ age: 10 })
    })

    it("should resolve correctly with filters", async () => {
      const query = userFactory.selectSingleQuery()
      expect(
        await query["~meta"].resolve({
          where: { age: { eq: 12 } },
        })
      ).toMatchObject({ age: 12 })
    })

    it("should be created with custom input", async () => {
      const query = userFactory.selectSingleQuery({
        input: v.pipe(
          v.object({
            age: v.nullish(v.number()),
          }),
          v.transform(({ age }) => ({
            where: age != null ? { age } : undefined,
          }))
        ),
      })

      expect(query).toBeDefined()
      expect(await query["~meta"].resolve({ age: 10 })).toMatchObject({
        age: 10,
      })
    })

    it("should be created with middlewares", async () => {
      type SelectSingleOptions = InferSelectSingleOptions<
        typeof db,
        typeof sqliteSchemas.users
      >
      let count = 0
      const query = userFactory.selectSingleQuery({
        middlewares: [
          async ({ parseInput, next }) => {
            const opts = await parseInput()
            if (opts.issues) throw new Error("Invalid input")

            expectTypeOf(opts.value).toEqualTypeOf<
              NonNullable<SelectSingleOptions> | undefined
            >()
            count++
            const answer = await next()
            expectTypeOf(answer).toEqualTypeOf<
              typeof sqliteSchemas.users.$inferSelect | undefined | null
            >()
            return answer
          },
        ],
      })

      await query["~meta"].resolve({})
      expect(count).toBe(1)
    })

    describe.concurrent("countQuery", () => {
      it("should be created without error", async () => {
        const query = userFactory.countQuery()
        expect(query).toBeDefined()
      })

      it("should resolve correctly with filters", async () => {
        const query = userFactory.countQuery()
        let answer

        answer = await query["~meta"].resolve({})
        expect(answer).toBe(5)

        answer = await query["~meta"].resolve({
          where: { age: { gte: 12 } },
        })
        expect(answer).toBe(3)

        answer = await query["~meta"].resolve({
          where: { age: { lt: 12 } },
        })
        expect(answer).toBe(2)

        answer = await query["~meta"].resolve({
          where: { age: { in: [10, 11] } },
        })
        expect(answer).toBe(2)

        answer = await query["~meta"].resolve({
          where: { name: { like: "J%" } },
        })
        expect(answer).toBe(5)
      })

      it("should be created with custom input", async () => {
        const query = userFactory.countQuery({
          input: v.pipe(
            v.object({
              age: v.nullish(v.number()),
            }),
            v.transform(({ age }) => ({
              where: age != null ? { age: { eq: age } } : undefined,
            }))
          ),
        })

        expect(query).toBeDefined()
        expect(await query["~meta"].resolve({ age: 10 })).toBe(1)
        expect(await query["~meta"].resolve({ age: null })).toBe(5)
      })

      it("should be created with middlewares", async () => {
        let count = 0
        const query = userFactory.countQuery({
          middlewares: [
            async ({ parseInput, next }) => {
              const opts = await parseInput()
              if (opts.issues) throw new Error("Invalid input")
              count++
              const answer = await next()
              expectTypeOf(answer).toEqualTypeOf<number>()
              return answer
            },
          ],
        })

        await query["~meta"].resolve({})
        expect(count).toBe(1)
      })
    })
  })

  describe("relationField", () => {
    afterAll(async () => {
      await db.delete(sqliteSchemas.studentCourseGrades)
      await db.delete(sqliteSchemas.studentToCourses)
      await db.delete(sqliteSchemas.courses)
      await db.delete(sqliteSchemas.posts)
    })

    it("should be created without error", () => {
      const postsField = userFactory.relationField("posts").description("posts")
      expect(postsField).toBeDefined()

      const postFactory = drizzleResolverFactory(db, "posts")
      const authorField = postFactory
        .relationField("author")
        .description("author")
      expect(authorField).toBeDefined()
    })

    it("should resolve correctly", async () => {
      const studentCourseFactory = drizzleResolverFactory(
        db,
        "studentToCourses"
      )
      const gradeField = studentCourseFactory.relationField("grade")
      const John = await db.query.users.findFirst({
        where: { name: "John" },
      })
      if (!John) throw new Error("John not found")
      const Joe = await db.query.users.findFirst({
        where: { name: "Joe" },
      })
      if (!Joe) throw new Error("Joe not found")

      const [math, english] = await db
        .insert(sqliteSchemas.courses)
        .values([{ name: "Math" }, { name: "English" }])
        .returning()

      const studentCourses = await db
        .insert(sqliteSchemas.studentToCourses)
        .values([
          { studentId: John.id, courseId: math.id },
          { studentId: John.id, courseId: english.id },
          { studentId: Joe.id, courseId: math.id },
          { studentId: Joe.id, courseId: english.id },
        ])
        .returning()

      await db.insert(sqliteSchemas.studentCourseGrades).values(
        studentCourses.map((it) => ({
          ...it,
          grade: Math.floor(Math.random() * 51) + 50,
        }))
      )

      let answer
      answer = await Promise.all(
        studentCourses.map((sc) => {
          return gradeField["~meta"].resolve(sc, undefined)
        })
      )

      expect(new Set(answer)).toMatchObject(
        new Set([
          { studentId: John.id, courseId: math.id, grade: expect.any(Number) },
          {
            studentId: John.id,
            courseId: english.id,
            grade: expect.any(Number),
          },
          { studentId: Joe.id, courseId: math.id, grade: expect.any(Number) },
          {
            studentId: Joe.id,
            courseId: english.id,
            grade: expect.any(Number),
          },
        ])
      )

      await db.insert(sqliteSchemas.posts).values([
        { authorId: John.id, title: "Hello" },
        { authorId: John.id, title: "World" },
      ])
      const postsField = userFactory.relationField("posts")
      answer = await postsField["~meta"].resolve(John, undefined)
      expect(answer).toMatchObject([
        { authorId: John.id, title: "Hello" },
        { authorId: John.id, title: "World" },
      ])
    })

    it("should throw an error when relation is not found", () => {
      expect(() => {
        userFactory.relationField("nonExistentRelation" as any)
      }).toThrow(
        "GQLoom-Drizzle Error: Relation users.nonExistentRelation not found in drizzle instance"
      )
    })
  })

  describe("relationField with multiple field relations", () => {
    afterAll(async () => {
      await db.delete(sqliteSchemas.studentCourseGrades)
      await db.delete(sqliteSchemas.studentToCourses)
      await db.delete(sqliteSchemas.courses)
    })

    it("should handle multi-field relations correctly", async () => {
      // This test specifically targets the multi-field relation handling in relationField
      const studentCourseFactory = drizzleResolverFactory(
        db,
        "studentToCourses"
      )

      // Setup test data
      const John = await db.query.users.findFirst({
        where: { name: "John" },
      })
      if (!John) throw new Error("John not found")

      const [math, english] = await db
        .insert(sqliteSchemas.courses)
        .values([{ name: "Math" }, { name: "English" }])
        .returning()

      // Insert multiple student-course relationships for the same student
      const studentCourses = await db
        .insert(sqliteSchemas.studentToCourses)
        .values([
          { studentId: John.id, courseId: math.id },
          { studentId: John.id, courseId: english.id },
        ])
        .returning()

      // Test loading multiple relations at once
      const courseField = studentCourseFactory.relationField("course")
      const results = await Promise.all(
        studentCourses.map((sc) => courseField["~meta"].resolve(sc, undefined))
      )

      expect(results).toMatchObject([
        { id: math.id, name: "Math" },
        { id: english.id, name: "English" },
      ])

      // Test with batch loading multiple parents
      const studentField = studentCourseFactory.relationField("student")
      const studentResults = await Promise.all(
        studentCourses.map((sc) => studentField["~meta"].resolve(sc, undefined))
      )

      expect(studentResults).toMatchObject([
        { id: John.id, name: "John" },
        { id: John.id, name: "John" },
      ])
    })

    it("should handle loading relation data correctly when using multiple fields", async () => {
      const studentCourseFactory = drizzleResolverFactory(
        db,
        "studentToCourses"
      )

      // Setup test data for multiple students
      const John = await db.query.users.findFirst({
        where: { name: "John" },
      })
      if (!John) throw new Error("John not found")

      const Joe = await db.query.users.findFirst({
        where: { name: "Joe" },
      })
      if (!Joe) throw new Error("Joe not found")

      const [math, english] = await db
        .insert(sqliteSchemas.courses)
        .values([{ name: "Math" }, { name: "English" }])
        .returning()

      // Insert relationships for multiple students
      const studentCourses = await db
        .insert(sqliteSchemas.studentToCourses)
        .values([
          { studentId: John.id, courseId: math.id },
          { studentId: John.id, courseId: english.id },
          { studentId: Joe.id, courseId: math.id },
          { studentId: Joe.id, courseId: english.id },
        ])
        .returning()

      // Use the loader to fetch multiple course relations at once
      const courseField = studentCourseFactory.relationField("course")

      // Load all courses for all student-course relationships at once
      const allResults = await Promise.all(
        studentCourses.map((sc) => courseField["~meta"].resolve(sc, undefined))
      )

      // Verify results include both Math and English courses
      expect(allResults.map((course) => (course as any).name).sort()).toEqual([
        "English",
        "English",
        "Math",
        "Math",
      ])

      // Test the student relationship in same batch
      const studentField = studentCourseFactory.relationField("student")
      const studentResults = await Promise.all(
        studentCourses.map((sc) => studentField["~meta"].resolve(sc, undefined))
      )

      // Verify results show both John and Joe
      const studentNames = studentResults
        .map((student) => (student as any).name)
        .sort()
      expect(studentNames).toEqual(["Joe", "Joe", "John", "John"])
    })

    it("should handle composite key relations correctly", async () => {
      // Create a mock implementation to test the multi-field relation handling directly

      // First, we'll manually mock the relation data to test the specific code paths
      const mockRelation = {
        sourceColumns: [{ name: "studentId" }, { name: "courseId" }],
        targetColumns: [{ name: "studentId" }, { name: "courseId" }],
      }

      // Manual test for getKeyByField with multiple fields
      const getKeyByField = (parent: any) => {
        const fieldsLength = mockRelation.sourceColumns.length
        if (fieldsLength === 1) {
          return parent[mockRelation.sourceColumns[0].name]
        }
        return mockRelation.sourceColumns
          .map((field) => parent[field.name])
          .join("-")
      }

      // Test with composite keys
      const parentWithCompositeKey = { studentId: 1, courseId: 2 }
      expect(getKeyByField(parentWithCompositeKey)).toBe("1-2")

      // Manual test for getKeyByReference with multiple fields
      const getKeyByReference = (item: any) => {
        const fieldsLength = mockRelation.targetColumns.length
        if (fieldsLength === 1) {
          return item[mockRelation.targetColumns[0].name]
        }
        return mockRelation.targetColumns
          .map((reference) => item[reference.name])
          .join("-")
      }

      // Test with composite keys for reference
      const itemWithCompositeKey = { studentId: 1, courseId: 2, grade: 95 }
      expect(getKeyByReference(itemWithCompositeKey)).toBe("1-2")

      // Now, create and test real data to verify the full flow
      const studentCourseFactory = drizzleResolverFactory(
        db,
        "studentToCourses"
      )

      // Setup test data for a composite key scenario
      // First create some test data
      const John = await db.query.users.findFirst({
        where: { name: "John" },
      })
      if (!John) throw new Error("John not found")

      const Jane = await db.query.users.findFirst({
        where: { name: "Jane" },
      })
      if (!Jane) throw new Error("Jane not found")

      // Insert courses if needed
      const [math, english] = await db
        .insert(sqliteSchemas.courses)
        .values([{ name: "Math" }, { name: "English" }])
        .returning()

      // Create student-to-course mappings with composite keys
      await db
        .insert(sqliteSchemas.studentToCourses)
        .values([
          { studentId: John.id, courseId: math.id },
          { studentId: John.id, courseId: english.id },
          { studentId: Jane.id, courseId: math.id },
        ])
        .returning()

      // Insert grades using the composite keys
      await db.insert(sqliteSchemas.studentCourseGrades).values([
        { studentId: John.id, courseId: math.id, grade: 90 },
        { studentId: John.id, courseId: english.id, grade: 85 },
        { studentId: Jane.id, courseId: math.id, grade: 95 },
      ])

      // Now test loading data with composite keys
      const gradeField = studentCourseFactory.relationField("grade")

      // Load grades for all student-course pairs
      const studentCourses = await db.query.studentToCourses.findMany({
        where: {
          OR: [
            { studentId: { eq: John.id }, courseId: { eq: math.id } },
            { studentId: { eq: John.id }, courseId: { eq: english.id } },
            { studentId: { eq: Jane.id }, courseId: { eq: math.id } },
          ],
        },
      })

      expect(studentCourses.length).toBe(3)

      const grades = await Promise.all(
        studentCourses.map((sc) => gradeField["~meta"].resolve(sc, undefined))
      )

      // Verify we got all the grades back
      expect(grades.length).toBe(3)

      // Check that each student-course pair got the correct grade
      const gradeMap = new Map()
      grades.forEach((g: any) => {
        if (g) {
          const key = `${g.studentId}-${g.courseId}`
          gradeMap.set(key, g.grade)
        }
      })

      expect(gradeMap.size).toBe(3)
      expect(gradeMap.has(`${John.id}-${math.id}`)).toBe(true)
      expect(gradeMap.has(`${John.id}-${english.id}`)).toBe(true)
      expect(gradeMap.has(`${Jane.id}-${math.id}`)).toBe(true)
    })
  })

  describe("resolver", () => {
    it("should be created without error", () => {
      const userExecutor = userFactory.resolver().toExecutor()
      expect(userExecutor).toBeDefined()
      expect(userExecutor.users).toBeDefined()
      expect(userExecutor.usersSingle).toBeDefined()
      expect(userExecutor.insertIntoUsers).toBeDefined()
      expect(userExecutor.insertIntoUsersSingle).toBeDefined()
      expect(userExecutor.updateUsers).toBeDefined()
      expect(userExecutor.deleteFromUsers).toBeDefined()
      expect(userExecutor.courses).toBeDefined()
      expect(userExecutor.posts).toBeDefined()
    })
  })
})

describe.concurrent("DrizzleMySQLResolverFactory", () => {
  const schema = {
    users: mysqlSchemas.users,
  }
  let db: MySql2Database<typeof schema, typeof mysqlRelations>
  let userFactory: DrizzleMySQLResolverFactory<
    typeof db,
    typeof mysqlSchemas.users
  >

  beforeAll(async () => {
    db = mysqlDrizzle(config.mysqlUrl, {
      schema,
      relations: mysqlRelations,
      mode: "default",
    })
    userFactory = drizzleResolverFactory(db, "users")
    await db.execute(sql`select 1`)
  })

  describe("insertArrayMutation", () => {
    it("should be created without error", async () => {
      const mutation = userFactory.insertArrayMutation()
      expect(mutation).toBeDefined()
    })

    it("should resolve correctly", async () => {
      const mutation = userFactory.insertArrayMutation()
      expect(
        await mutation["~meta"].resolve({
          values: [
            { name: "John", age: 5 },
            { name: "Jane", age: 6 },
          ],
        })
      ).toMatchObject({ isSuccess: true })

      await db
        .delete(mysqlSchemas.users)
        .where(inArray(mysqlSchemas.users.age, [5, 6]))
    })

    it("should be created with custom input", async () => {
      const mutation = userFactory
        .insertArrayMutation()
        .description("Insert users")
        .input(
          v.pipe(
            v.array(v.object({ name: v.string(), age: v.number() })),
            v.transform((values) => ({ values }))
          )
        )

      expect(mutation).toBeDefined()
      expect(
        await mutation["~meta"].resolve([
          { name: "John", age: 5 },
          { name: "Jane", age: 6 },
        ])
      ).toMatchObject({
        isSuccess: true,
      })

      await db
        .delete(mysqlSchemas.users)
        .where(inArray(mysqlSchemas.users.age, [5, 6]))
    })
  })

  describe("insertSingleMutation", () => {
    it("should be created without error", async () => {
      const mutation = userFactory.insertSingleMutation()
      expect(mutation).toBeDefined()
    })

    it("should resolve correctly", async () => {
      const mutation = userFactory.insertSingleMutation()
      const answer = await mutation["~meta"].resolve({
        value: { name: "John", age: 7 },
      })
      expect(answer).toMatchObject({ isSuccess: true })

      await db.delete(mysqlSchemas.users).where(eq(mysqlSchemas.users.age, 7))
    })
  })

  describe("updateMutation", () => {
    it("should be created without error", async () => {
      const mutation = userFactory.updateMutation()
      expect(mutation).toBeDefined()
    })

    it("should resolve correctly", async () => {
      await db.insert(mysqlSchemas.users).values({ name: "Bob", age: 18 })
      const mutation = userFactory.updateMutation()
      expect(
        await mutation["~meta"].resolve({
          where: { name: { eq: "Bob" } },
          set: { age: 19 },
        })
      ).toMatchObject({ isSuccess: true })
      await db
        .delete(mysqlSchemas.users)
        .where(eq(mysqlSchemas.users.name, "Bob"))
    })
  })

  describe("deleteMutation", () => {
    it("should be created without error", async () => {
      const mutation = userFactory.deleteMutation()
      expect(mutation).toBeDefined()
    })

    it("should resolve correctly", async () => {
      await db.insert(mysqlSchemas.users).values({ name: "Alice", age: 18 })
      try {
        const mutation = userFactory.deleteMutation()
        const answer = await mutation["~meta"].resolve({
          where: { name: { eq: "Alice" } },
        })
        expect(answer).toMatchObject({ isSuccess: true })
      } finally {
        await db
          .delete(mysqlSchemas.users)
          .where(eq(mysqlSchemas.users.name, "Alice"))
      }
    })
  })
})

describe.concurrent("DrizzlePostgresResolverFactory", () => {
  const schema = {
    users: pgSchemas.users,
  }
  let db: NodePgDatabase<typeof schema, typeof pgRelations>
  let userFactory: DrizzlePostgresResolverFactory<
    typeof db,
    typeof pgSchemas.users
  >

  beforeAll(async () => {
    db = pgDrizzle(config.postgresUrl, {
      schema,
      relations: pgRelations,
    })
    userFactory = drizzleResolverFactory(db, "users")
    await db.execute(sql`select 1`)
  })

  describe("insertArrayMutation", () => {
    it("should be created without error", async () => {
      const mutation = userFactory.insertArrayMutation()
      expect(mutation).toBeDefined()
    })

    it("should resolve correctly", async () => {
      const mutation = userFactory.insertArrayMutation()
      const answer = await mutation["~meta"].resolve({
        values: [
          { name: "John", age: 5 },
          { name: "Jane", age: 6 },
        ],
      })
      expect(answer).toMatchObject([
        { name: "John", age: 5 },
        { name: "Jane", age: 6 },
      ])

      await db
        .delete(pgSchemas.users)
        .where(inArray(pgSchemas.users.age, [5, 6]))
    })

    it("should be created with custom input", async () => {
      const mutation = userFactory
        .insertArrayMutation()
        .description("Insert users")
        .input(
          v.pipe(
            v.array(v.object({ name: v.string(), age: v.number() })),
            v.transform((values) => ({ values }))
          )
        )

      expect(mutation).toBeDefined()
      expect(
        await mutation["~meta"].resolve([
          { name: "John", age: 5 },
          { name: "Jane", age: 6 },
        ])
      ).toMatchObject([
        { name: "John", age: 5 },
        { name: "Jane", age: 6 },
      ])

      await db
        .delete(pgSchemas.users)
        .where(inArray(mysqlSchemas.users.age, [5, 6]))
    })
  })

  describe("insertSingleMutation", () => {
    it("should be created without error", async () => {
      const mutation = userFactory.insertSingleMutation()
      expect(mutation).toBeDefined()
    })

    it("should resolve correctly", async () => {
      const mutation = userFactory.insertSingleMutation()
      const answer = await mutation["~meta"].resolve({
        value: { name: "John", age: 7 },
      })

      expect(answer).toMatchObject({ name: "John", age: 7 })

      await db.delete(pgSchemas.users).where(eq(pgSchemas.users.id, answer!.id))
    })
  })

  describe("updateMutation", () => {
    it("should be created without error", async () => {
      const mutation = userFactory.updateMutation()
      expect(mutation).toBeDefined()
    })

    it("should resolve correctly", async () => {
      await db.insert(pgSchemas.users).values({ name: "Bob", age: 18 })
      try {
        const mutation = userFactory.updateMutation()
        const answer = await mutation["~meta"].resolve({
          where: { name: { eq: "Bob" } },
          set: { age: 19 },
        })
        expect(answer).toMatchObject([{ name: "Bob", age: 19 }])
      } finally {
        await db.delete(pgSchemas.users).where(eq(pgSchemas.users.name, "Bob"))
      }
    })
  })

  describe("deleteMutation", () => {
    it("should be created without error", async () => {
      const mutation = userFactory.deleteMutation()
      expect(mutation).toBeDefined()
    })

    it("should resolve correctly", async () => {
      await db.insert(pgSchemas.users).values({ name: "Alice", age: 18 })
      try {
        const mutation = userFactory.deleteMutation()
        const answer = await mutation["~meta"].resolve({
          where: { name: { eq: "Alice" } },
        })
        expect(answer).toMatchObject([{ name: "Alice", age: 18 }])
      } finally {
        await db
          .delete(pgSchemas.users)
          .where(eq(pgSchemas.users.name, "Alice"))
      }
    })
  })
})

describe.concurrent("DrizzleSQLiteResolverFactory", () => {
  let db: LibSQLDatabase<typeof sqliteSchemas, typeof sqliteRelations>
  let userFactory: DrizzleSQLiteResolverFactory<
    typeof db,
    typeof sqliteSchemas.users
  >

  beforeAll(async () => {
    db = sqliteDrizzle({
      schema: sqliteSchemas,
      relations: sqliteRelations,
      connection: { url: `file:${pathToDB.pathname}` },
    })

    userFactory = drizzleResolverFactory(db, "users")
  })

  describe("insertArrayMutation", () => {
    it("should be created without error", async () => {
      const mutation = userFactory.insertArrayMutation()
      expect(mutation).toBeDefined()
    })

    it("should resolve correctly", async () => {
      const mutation = userFactory.insertArrayMutation()

      const answer = await mutation["~meta"].resolve({
        values: [
          { name: "John", age: 5 },
          { name: "Jane", age: 6 },
        ],
      })

      expect(answer).toMatchObject([
        { name: "John", age: 5 },
        { name: "Jane", age: 6 },
      ])

      await db
        .delete(sqliteSchemas.users)
        .where(inArray(sqliteSchemas.users.age, [5, 6]))
    })
  })

  describe("insertSingleMutation", () => {
    it("should be created without error", async () => {
      const mutation = userFactory.insertSingleMutation()
      expect(mutation).toBeDefined()
    })

    it("should resolve correctly", async () => {
      const mutation = userFactory.insertSingleMutation()
      const answer = await mutation["~meta"].resolve({
        value: { name: "John", age: 7 },
      })
      expect(answer).toMatchObject({ name: "John", age: 7 })

      await db
        .delete(sqliteSchemas.users)
        .where(eq(sqliteSchemas.users.id, answer!.id))
    })

    it("should be created with custom input", async () => {
      const mutation = userFactory
        .insertArrayMutation()
        .description("Insert users")
        .input(
          v.pipe(
            v.array(v.object({ name: v.string(), age: v.number() })),
            v.transform((values) => ({ values }))
          )
        )

      expect(mutation).toBeDefined()
      expect(
        await mutation["~meta"].resolve([
          { name: "John", age: 5 },
          { name: "Jane", age: 6 },
        ])
      ).toMatchObject([
        { name: "John", age: 5 },
        { name: "Jane", age: 6 },
      ])

      await db
        .delete(sqliteSchemas.users)
        .where(inArray(sqliteSchemas.users.age, [5, 6]))
    })
  })

  describe("updateMutation", () => {
    it("should be created without error", async () => {
      const mutation = userFactory.updateMutation()
      expect(mutation).toBeDefined()
    })

    it("should resolve correctly", async () => {
      await db.insert(sqliteSchemas.users).values({ name: "Bob", age: 18 })
      try {
        const mutation = userFactory.updateMutation()
        const answer = await mutation["~meta"].resolve({
          where: { name: { eq: "Bob" } },
          set: { age: 19 },
        })
        expect(answer).toMatchObject([{ name: "Bob", age: 19 }])
      } finally {
        await db
          .delete(sqliteSchemas.users)
          .where(eq(sqliteSchemas.users.name, "Bob"))
      }
    })
  })

  describe("deleteMutation", () => {
    it("should be created without error", async () => {
      const mutation = userFactory.deleteMutation()
      expect(mutation).toBeDefined()
    })

    it("should resolve correctly", async () => {
      await db.insert(sqliteSchemas.users).values({ name: "Alice", age: 18 })
      try {
        const mutation = userFactory.deleteMutation()
        const answer = await mutation["~meta"].resolve({
          where: { name: { eq: "Alice" } },
        })

        expect(answer).toMatchObject([{ name: "Alice", age: 18 }])
      } finally {
        await db
          .delete(sqliteSchemas.users)
          .where(eq(sqliteSchemas.users.name, "Alice"))
      }
    })
  })
})
