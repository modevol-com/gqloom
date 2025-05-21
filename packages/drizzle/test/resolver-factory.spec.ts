import { resolver } from "@gqloom/core"
import { type InferSelectModel, eq, inArray, sql } from "drizzle-orm"
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
import * as pgSchemas from "./schema/postgres"
import * as sqliteSchemas from "./schema/sqlite"

const pathToDB = new URL("./schema/sqlite.db", import.meta.url)

describe.concurrent("DrizzleResolverFactory", () => {
  let db: LibSQLDatabase<typeof sqliteSchemas>
  let userFactory: DrizzleSQLiteResolverFactory<
    typeof db,
    typeof sqliteSchemas.user
  >

  beforeAll(async () => {
    db = sqliteDrizzle({
      schema: sqliteSchemas,
      connection: { url: `file:${pathToDB.pathname}` },
    })

    userFactory = drizzleResolverFactory(db, sqliteSchemas.user)
    await db.insert(sqliteSchemas.user).values([
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
    ] satisfies (typeof sqliteSchemas.user.$inferInsert)[])
  })

  afterAll(async () => {
    await db.delete(sqliteSchemas.user)
  })

  it("should create a resolver factory", () => {
    expect(userFactory).toBeInstanceOf(DrizzleResolverFactory)
  })

  describe.concurrent("selectArrayQuery", () => {
    it("should be created without error", async () => {
      const query = userFactory.selectArrayQuery()
      expect(query).toBeDefined()
    })

    it("should be used without error", () => {
      const userResolver = resolver.of(sqliteSchemas.user, {
        users: userFactory.selectArrayQuery(),
      })

      expect(userResolver).toBeDefined()
    })

    it("should resolve correctly with orderBy", async () => {
      const executor = userFactory.resolver().toExecutor()

      let answer
      answer = await executor.user({ orderBy: [{ age: "asc" }] })

      expect(answer).toMatchObject([
        { age: 10 },
        { age: 11 },
        { age: 12 },
        { age: 13 },
        { age: 14 },
      ])

      answer = await executor.user({ orderBy: [{ age: "desc" }] })
      expect(answer).toMatchObject([
        { age: 14 },
        { age: 13 },
        { age: 12 },
        { age: 11 },
        { age: 10 },
      ])
    })

    it("should resolve correctly with filters", async () => {
      const executor = userFactory.resolver().toExecutor()
      let answer
      answer = await executor.user({})
      expect(answer).toHaveLength(5)

      answer = await executor.user({
        where: { age: { gte: 12 } },
      })
      expect(answer).toMatchObject([{ age: 12 }, { age: 13 }, { age: 14 }])

      answer = await executor.user({
        where: { age: { lt: 12 } },
      })
      expect(answer).toMatchObject([{ age: 10 }, { age: 11 }])
      answer = await executor.user({
        where: { age: { gte: 12, lt: 13 } },
      })
      expect(answer).toMatchObject([{ age: 12 }])

      answer = await executor.user({
        where: { age: { inArray: [10, 11] } },
      })
      expect(new Set(answer)).toMatchObject(new Set([{ age: 10 }, { age: 11 }]))

      answer = await executor.user({
        where: { age: { notInArray: [10, 11] } },
      })
      expect(new Set(answer)).toMatchObject(
        new Set([{ age: 12 }, { age: 13 }, { age: 14 }])
      )

      answer = await executor.user({
        where: { age: { OR: [{ eq: 10 }, { eq: 11 }] } },
      })
      expect(new Set(answer)).toMatchObject(new Set([{ age: 10 }, { age: 11 }]))

      answer = await executor.user({
        where: { OR: [{ age: { eq: 10 } }, { age: { eq: 11 } }] },
      })
      expect(new Set(answer)).toMatchObject(new Set([{ age: 10 }, { age: 11 }]))

      answer = await executor.user({
        where: { name: { like: "J%" } },
      })
      expect(answer).toHaveLength(5)

      await expect(() =>
        executor.user({
          where: { age: { eq: 10 }, OR: [{ age: { eq: 11 } }] },
        })
      ).rejects.toThrow("Cannot specify both fields and 'OR' in table filters!")
      await expect(() =>
        executor.user({
          where: { age: { eq: 10, OR: [{ eq: 11 }] } },
        })
      ).rejects.toThrow(
        "WHERE age: Cannot specify both fields and 'OR' in column operators!"
      )

      answer = await executor.user({
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
            where: age != null ? eq(sqliteSchemas.user.age, age) : undefined,
          }))
        ),
      })

      const executor = resolver({ query }).toExecutor()

      expect(query).toBeDefined()
      answer = await executor.query({ age: 10 })
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
              where: age != null ? eq(sqliteSchemas.user.age, age) : undefined,
            }))
          )
        )

      expect(query).toBeDefined()
      answer = await executor.query({ age: 10 })
      expect(answer).toMatchObject([{ age: 10 }])
    })

    it("should be created with middlewares", async () => {
      type SelectArrayOptions = InferSelectArrayOptions<
        typeof db,
        typeof sqliteSchemas.user
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
                InferSelectModel<typeof sqliteSchemas.user>[]
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
            InferSelectModel<typeof sqliteSchemas.user>[]
          >()
          return answer
        })
      const executor = resolver({ query }).toExecutor()
      await executor.query({})
      expect(count).toBe(2)
    })
  })

  describe.concurrent("selectSingleQuery", () => {
    it("should be used without error", () => {
      const userResolver = resolver.of(sqliteSchemas.user, {
        user: userFactory.selectSingleQuery(),
      })

      expect(userResolver).toBeDefined()
    })

    it("should be created without error", () => {
      const query = userFactory.selectSingleQuery()
      expect(query).toBeDefined()
    })

    it("should resolve correctly with orderBy", async () => {
      const query = userFactory.selectSingleQuery()
      const executor = resolver({ query }).toExecutor()
      expect(
        await executor.query({
          orderBy: [{ age: "asc" }],
        })
      ).toMatchObject({ age: 10 })
    })

    it("should resolve correctly with filters", async () => {
      const query = userFactory.selectSingleQuery()
      const executor = resolver({ query }).toExecutor()
      expect(
        await executor.query({
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
            where: age != null ? eq(sqliteSchemas.user.age, age) : undefined,
          }))
        ),
      })
      const executor = resolver({ query }).toExecutor()

      expect(query).toBeDefined()
      expect(await executor.query({ age: 10 })).toMatchObject({
        age: 10,
      })
    })

    it("should be created with middlewares", async () => {
      type SelectSingleOptions = InferSelectSingleOptions<
        typeof db,
        typeof sqliteSchemas.user
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
              typeof sqliteSchemas.user.$inferSelect | undefined | null
            >()
            return answer
          },
        ],
      })
      const executor = resolver({ query }).toExecutor()
      await executor.query({})
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
          where: { age: { inArray: [10, 11] } },
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
        const executor = resolver({ query }).toExecutor()
        expect(await executor.query({ age: 10 })).toBe(1)
        expect(await executor.query({ age: null })).toBe(5)
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

        const executor = resolver({ query }).toExecutor()
        await executor.query({})
        expect(count).toBe(1)
      })
    })
  })

  describe("relationField", () => {
    afterAll(async () => {
      await db.delete(sqliteSchemas.studentCourseGrade)
      await db.delete(sqliteSchemas.studentToCourse)
      await db.delete(sqliteSchemas.course)
      await db.delete(sqliteSchemas.post)
    })

    it("should be used without error", () => {
      const userResolver = resolver.of(sqliteSchemas.user, {
        posts: userFactory.relationField("posts"),
      })

      const postFactory = drizzleResolverFactory(db, sqliteSchemas.post)
      const postResolver = resolver.of(sqliteSchemas.post, {
        author: postFactory.relationField("author"),
      })
      expect(userResolver).toBeDefined()
      expect(postResolver).toBeDefined()
    })

    it("should be created without error", () => {
      const postsField = userFactory.relationField("posts").description("posts")
      expect(postsField).toBeDefined()

      const postFactory = drizzleResolverFactory(db, "post")
      const authorField = postFactory
        .relationField("author")
        .description("author")
      expect(authorField).toBeDefined()
    })

    it("should resolve correctly", async () => {
      const studentCourseFactory = drizzleResolverFactory(db, "studentToCourse")
      const gradeField = studentCourseFactory.relationField("grade")
      const John = await db.query.user.findFirst({
        where: eq(sqliteSchemas.user.name, "John"),
      })
      if (!John) throw new Error("John not found")
      const Joe = await db.query.user.findFirst({
        where: eq(sqliteSchemas.user.name, "Joe"),
      })
      if (!Joe) throw new Error("Joe not found")

      const [math, english] = await db
        .insert(sqliteSchemas.course)
        .values([{ name: "Math" }, { name: "English" }])
        .returning()

      const studentCourses = await db
        .insert(sqliteSchemas.studentToCourse)
        .values([
          { studentId: John.id, courseId: math.id },
          { studentId: John.id, courseId: english.id },
          { studentId: Joe.id, courseId: math.id },
          { studentId: Joe.id, courseId: english.id },
        ])
        .returning()

      await db.insert(sqliteSchemas.studentCourseGrade).values(
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
          { studentId: John.id, courseId: math.id },
          {
            studentId: John.id,
            courseId: english.id,
          },
          { studentId: Joe.id, courseId: math.id },
          {
            studentId: Joe.id,
            courseId: english.id,
          },
        ])
      )

      await db.insert(sqliteSchemas.post).values([
        { authorId: John.id, title: "Hello" },
        { authorId: John.id, title: "World" },
      ])
      const postsField = userFactory.relationField("posts")
      answer = await postsField["~meta"].resolve(John, undefined)
      expect(answer).toMatchObject([
        { authorId: John.id },
        { authorId: John.id },
      ])
    })
  })

  describe("resolver", () => {
    it("should be created without error", () => {
      const userExecutor = userFactory.resolver().toExecutor()
      expect(userExecutor).toBeDefined()
      expect(userExecutor.user).toBeDefined()
      expect(userExecutor.userSingle).toBeDefined()
      expect(userExecutor.insertIntoUser).toBeDefined()
      expect(userExecutor.insertIntoUserSingle).toBeDefined()
      expect(userExecutor.updateUser).toBeDefined()
      expect(userExecutor.deleteFromUser).toBeDefined()
      expect(userExecutor.courses).toBeDefined()
      expect(userExecutor.posts).toBeDefined()
    })
  })

  describe.concurrent("queriesResolver", () => {
    it("should be created without error", async () => {
      const resolver = userFactory.queriesResolver()
      expect(resolver).toBeDefined()
    })

    it("should resolve queries correctly", async () => {
      const executor = userFactory.queriesResolver().toExecutor()

      // Test array query
      const arrayAnswer = await executor.user({ orderBy: [{ age: "asc" }] })
      expect(arrayAnswer).toMatchObject([
        { age: 10 },
        { age: 11 },
        { age: 12 },
        { age: 13 },
        { age: 14 },
      ])

      // Test single query
      const singleAnswer = await executor.userSingle({
        where: { age: { eq: 12 } },
      })
      expect(singleAnswer).toMatchObject({ age: 12 })

      // Test count query
      const countAnswer = await executor.userCount({
        where: { age: { gte: 12 } },
      })
      expect(countAnswer).toBe(3)
    })

    it("should be created with custom name", async () => {
      const resolver = userFactory.queriesResolver({ name: "customUser" })
      const executor = resolver.toExecutor()

      const answer = await executor.customUser({ orderBy: [{ age: "asc" }] })
      expect(answer).toMatchObject([
        { age: 10 },
        { age: 11 },
        { age: 12 },
        { age: 13 },
        { age: 14 },
      ])
    })

    it("should be created with middlewares", async () => {
      let count = 0
      const resolver = userFactory.queriesResolver({
        middlewares: [
          async ({ parseInput, next }) => {
            const opts = await parseInput()
            if (opts.issues) throw new Error("Invalid input")
            count++
            const answer = await next()
            return answer
          },
        ],
      })
      const executor = resolver.toExecutor()

      await executor.user({ orderBy: [{ age: "asc" }] })
      expect(count).toBe(1)
    })
  })
})

describe.concurrent("DrizzleMySQLResolverFactory", () => {
  const schema = {
    drizzle_user: mysqlSchemas.user,
  }
  let db: MySql2Database<typeof schema>
  let userFactory: DrizzleMySQLResolverFactory<
    typeof db,
    typeof mysqlSchemas.user
  >

  beforeAll(async () => {
    db = mysqlDrizzle(config.mysqlUrl, { schema, mode: "default" })
    userFactory = drizzleResolverFactory(db, "drizzle_user")
    await db.execute(sql`select 1`)
  })

  describe("insertArrayMutation", () => {
    it("should be used without error", () => {
      const userResolver = resolver.of(mysqlSchemas.user, {
        insertArrayMutation: userFactory.insertArrayMutation(),
      })

      expect(userResolver).toBeDefined()
    })
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
        .delete(mysqlSchemas.user)
        .where(inArray(mysqlSchemas.user.age, [5, 6]))
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
      const executor = resolver({ mutation }).toExecutor()
      expect(
        await executor.mutation([
          { name: "John", age: 5 },
          { name: "Jane", age: 6 },
        ])
      ).toMatchObject({
        isSuccess: true,
      })

      await db
        .delete(mysqlSchemas.user)
        .where(inArray(mysqlSchemas.user.age, [5, 6]))
    })
  })

  describe("insertSingleMutation", () => {
    it("should be used without error", () => {
      const userResolver = resolver.of(mysqlSchemas.user, {
        insertSingleMutation: userFactory.insertSingleMutation(),
      })

      expect(userResolver).toBeDefined()
    })

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

      await db.delete(mysqlSchemas.user).where(eq(mysqlSchemas.user.age, 7))
    })
  })

  describe("updateMutation", () => {
    it("should be used without error", () => {
      const userResolver = resolver.of(mysqlSchemas.user, {
        updateMutation: userFactory.updateMutation(),
      })

      expect(userResolver).toBeDefined()
    })
    it("should be created without error", async () => {
      const mutation = userFactory.updateMutation()
      expect(mutation).toBeDefined()
    })

    it("should resolve correctly", async () => {
      await db.insert(mysqlSchemas.user).values({ name: "Bob", age: 18 })
      const mutation = userFactory.updateMutation()
      expect(
        await mutation["~meta"].resolve({
          where: { name: { eq: "Bob" } },
          set: { age: 19 },
        })
      ).toMatchObject({ isSuccess: true })
      await db
        .delete(mysqlSchemas.user)
        .where(eq(mysqlSchemas.user.name, "Bob"))
    })
  })

  describe("deleteMutation", () => {
    it("should be used without error", () => {
      const userResolver = resolver.of(mysqlSchemas.user, {
        deleteMutation: userFactory.deleteMutation(),
      })

      expect(userResolver).toBeDefined()
    })
    it("should be created without error", async () => {
      const mutation = userFactory.deleteMutation()
      expect(mutation).toBeDefined()
    })

    it("should resolve correctly", async () => {
      await db.insert(mysqlSchemas.user).values({ name: "Alice", age: 18 })
      try {
        const mutation = userFactory.deleteMutation()
        const answer = await mutation["~meta"].resolve({
          where: { name: { eq: "Alice" } },
        })
        expect(answer).toMatchObject({ isSuccess: true })
      } finally {
        await db
          .delete(mysqlSchemas.user)
          .where(eq(mysqlSchemas.user.name, "Alice"))
      }
    })
  })
})

describe.concurrent("DrizzlePostgresResolverFactory", () => {
  const schema = {
    drizzle_user: pgSchemas.user,
  }
  let db: NodePgDatabase<typeof schema>
  let userFactory: DrizzlePostgresResolverFactory<
    typeof db,
    typeof pgSchemas.user
  >

  beforeAll(async () => {
    db = pgDrizzle(config.postgresUrl, { schema })
    userFactory = drizzleResolverFactory(db, "drizzle_user")
    await db.execute(sql`select 1`)
  })

  describe("insertArrayMutation", () => {
    it("should be used without error", () => {
      const userResolver = resolver.of(pgSchemas.user, {
        insertArrayMutation: userFactory.insertArrayMutation(),
      })

      expect(userResolver).toBeDefined()
    })
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

      await db.delete(pgSchemas.user).where(inArray(pgSchemas.user.age, [5, 6]))
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
      const executor = resolver({ mutation }).toExecutor()
      expect(
        await executor.mutation([
          { name: "John", age: 5 },
          { name: "Jane", age: 6 },
        ])
      ).toMatchObject([
        { name: "John", age: 5 },
        { name: "Jane", age: 6 },
      ])

      await db
        .delete(pgSchemas.user)
        .where(inArray(mysqlSchemas.user.age, [5, 6]))
    })
  })

  describe("insertSingleMutation", () => {
    it("should be used without error", () => {
      const userResolver = resolver.of(pgSchemas.user, {
        insertSingleMutation: userFactory.insertSingleMutation(),
      })

      expect(userResolver).toBeDefined()
    })
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

      await db.delete(pgSchemas.user).where(eq(pgSchemas.user.id, answer!.id))
    })
  })

  describe("updateMutation", () => {
    it("should be used without error", () => {
      const userResolver = resolver.of(pgSchemas.user, {
        updateMutation: userFactory.updateMutation(),
      })

      expect(userResolver).toBeDefined()
    })
    it("should be created without error", async () => {
      const mutation = userFactory.updateMutation()
      expect(mutation).toBeDefined()
    })

    it("should resolve correctly", async () => {
      await db.insert(pgSchemas.user).values({ name: "Bob", age: 18 })
      try {
        const mutation = userFactory.updateMutation()
        const answer = await mutation["~meta"].resolve({
          where: { name: { eq: "Bob" } },
          set: { age: 19 },
        })
        expect(answer).toMatchObject([{ name: "Bob", age: 19 }])
      } finally {
        await db.delete(pgSchemas.user).where(eq(pgSchemas.user.name, "Bob"))
      }
    })
  })

  describe("deleteMutation", () => {
    it("should be used without error", () => {
      const userResolver = resolver.of(pgSchemas.user, {
        deleteMutation: userFactory.deleteMutation(),
      })

      expect(userResolver).toBeDefined()
    })

    it("should be created without error", async () => {
      const mutation = userFactory.deleteMutation()
      expect(mutation).toBeDefined()
    })

    it("should resolve correctly", async () => {
      await db.insert(pgSchemas.user).values({ name: "Alice", age: 18 })
      try {
        const mutation = userFactory.deleteMutation()
        const answer = await mutation["~meta"].resolve({
          where: { name: { eq: "Alice" } },
        })
        expect(answer).toMatchObject([{ name: "Alice", age: 18 }])
      } finally {
        await db.delete(pgSchemas.user).where(eq(pgSchemas.user.name, "Alice"))
      }
    })
  })
})

describe.concurrent("DrizzleSQLiteResolverFactory", () => {
  let db: LibSQLDatabase<typeof sqliteSchemas>
  let userFactory: DrizzleSQLiteResolverFactory<
    typeof db,
    typeof sqliteSchemas.user
  >

  beforeAll(async () => {
    db = sqliteDrizzle({
      schema: sqliteSchemas,
      connection: { url: `file:${pathToDB.pathname}` },
    })

    userFactory = drizzleResolverFactory(db, "user")
  })

  describe("insertArrayMutation", () => {
    it("should be used without error", () => {
      const userResolver = resolver.of(sqliteSchemas.user, {
        insertArrayMutation: userFactory.insertArrayMutation(),
      })

      expect(userResolver).toBeDefined()
    })

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
        .delete(sqliteSchemas.user)
        .where(inArray(sqliteSchemas.user.age, [5, 6]))
    })
  })

  describe("insertSingleMutation", () => {
    it("should be used without error", () => {
      const userResolver = resolver.of(sqliteSchemas.user, {
        insertSingleMutation: userFactory.insertSingleMutation(),
      })

      expect(userResolver).toBeDefined()
    })

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
        .delete(sqliteSchemas.user)
        .where(eq(sqliteSchemas.user.id, answer!.id))
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
      const executor = resolver({ mutation }).toExecutor()
      expect(
        await executor.mutation([
          { name: "John", age: 5 },
          { name: "Jane", age: 6 },
        ])
      ).toMatchObject([
        { name: "John", age: 5 },
        { name: "Jane", age: 6 },
      ])

      await db
        .delete(sqliteSchemas.user)
        .where(inArray(sqliteSchemas.user.age, [5, 6]))
    })
  })

  describe("updateMutation", () => {
    it("should be used without error", () => {
      const userResolver = resolver.of(sqliteSchemas.user, {
        updateMutation: userFactory.updateMutation(),
      })

      expect(userResolver).toBeDefined()
    })

    it("should be created without error", async () => {
      const mutation = userFactory.updateMutation()
      expect(mutation).toBeDefined()
    })

    it("should resolve correctly", async () => {
      await db.insert(sqliteSchemas.user).values({ name: "Bob", age: 18 })
      try {
        const mutation = userFactory.updateMutation()
        const answer = await mutation["~meta"].resolve({
          where: { name: { eq: "Bob" } },
          set: { age: 19 },
        })
        expect(answer).toMatchObject([{ name: "Bob", age: 19 }])
      } finally {
        await db
          .delete(sqliteSchemas.user)
          .where(eq(sqliteSchemas.user.name, "Bob"))
      }
    })
  })

  describe("deleteMutation", () => {
    it("should be used without error", () => {
      const userResolver = resolver.of(sqliteSchemas.user, {
        deleteMutation: userFactory.deleteMutation(),
      })

      expect(userResolver).toBeDefined()
    })

    it("should be created without error", async () => {
      const mutation = userFactory.deleteMutation()
      expect(mutation).toBeDefined()
    })

    it("should resolve correctly", async () => {
      await db.insert(sqliteSchemas.user).values({ name: "Alice", age: 18 })
      try {
        const mutation = userFactory.deleteMutation()
        const answer = await mutation["~meta"].resolve({
          where: { name: { eq: "Alice" } },
        })

        expect(answer).toMatchObject([{ name: "Alice", age: 18 }])
      } finally {
        await db
          .delete(sqliteSchemas.user)
          .where(eq(sqliteSchemas.user.name, "Alice"))
      }
    })
  })
})
