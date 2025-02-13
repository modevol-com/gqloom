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
  type InferSelectArrayOptions,
  type InferSelectSingleOptions,
} from "../src"
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

    userFactory = DrizzleResolverFactory.create(db, sqliteSchemas.user)

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

  it("should throw an error if the table is not found", () => {
    const unknownTable = sqlite.sqliteTable("unknown", {
      id: sqlite.integer("id").primaryKey(),
    })
    expect(() => DrizzleResolverFactory.create(db, unknownTable)).toThrow(
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
      answer = await query.resolve({ orderBy: [{ age: "asc" }] })
      expect(answer).toMatchObject([
        { age: 10 },
        { age: 11 },
        { age: 12 },
        { age: 13 },
        { age: 14 },
      ])

      answer = await query.resolve({ orderBy: [{ age: "desc" }] })
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
      answer = await query.resolve({})
      expect(answer).toHaveLength(5)

      answer = await query.resolve({
        where: { age: { gte: 12 } },
      })
      expect(answer).toMatchObject([{ age: 12 }, { age: 13 }, { age: 14 }])

      answer = await query.resolve({
        where: { age: { lt: 12 } },
      })
      expect(answer).toMatchObject([{ age: 10 }, { age: 11 }])
      answer = await query.resolve({
        where: { age: { gte: 12, lt: 13 } },
      })
      expect(answer).toMatchObject([{ age: 12 }])

      answer = await query.resolve({
        where: { age: { inArray: [10, 11] } },
      })
      expect(new Set(answer)).toMatchObject(new Set([{ age: 10 }, { age: 11 }]))

      answer = await query.resolve({
        where: { age: { notInArray: [10, 11] } },
      })
      expect(new Set(answer)).toMatchObject(
        new Set([{ age: 12 }, { age: 13 }, { age: 14 }])
      )

      answer = await query.resolve({
        where: { age: { OR: [{ eq: 10 }, { eq: 11 }] } },
      })
      expect(new Set(answer)).toMatchObject(new Set([{ age: 10 }, { age: 11 }]))

      answer = await query.resolve({
        where: { OR: [{ age: { eq: 10 } }, { age: { eq: 11 } }] },
      })
      expect(new Set(answer)).toMatchObject(new Set([{ age: 10 }, { age: 11 }]))

      answer = await query.resolve({
        where: { name: { like: "J%" } },
      })
      expect(answer).toHaveLength(5)

      await expect(() =>
        query.resolve({
          where: { age: { eq: 10 }, OR: [{ age: { eq: 11 } }] },
        })
      ).rejects.toThrow("Cannot specify both fields and 'OR' in table filters!")
      await expect(() =>
        query.resolve({
          where: { age: { eq: 10, OR: [{ eq: 11 }] } },
        })
      ).rejects.toThrow(
        "WHERE age: Cannot specify both fields and 'OR' in column operators!"
      )

      answer = await query.resolve({
        where: { age: { isNull: true } },
      })
      expect(answer).toHaveLength(0)
    })

    it("should be created with custom input", async () => {
      const query = userFactory.selectArrayQuery({
        input: v.pipe(
          v.object({
            age: v.nullish(v.number()),
          }),
          v.transform(({ age }) => ({
            where: age != null ? eq(sqliteSchemas.user.age, age) : undefined,
          }))
        ),
      })

      expect(query).toBeDefined()
      const answer = await query.resolve({ age: 10 })
      expect(answer).toMatchObject([{ age: 10 }])
    })

    it("should be created with middlewares", async () => {
      type SelectArrayOptions = InferSelectArrayOptions<
        typeof db,
        typeof sqliteSchemas.user
      >

      let count = 0

      const query = userFactory.selectArrayQuery({
        middlewares: [
          async ({ parseInput, next }) => {
            const opts = await parseInput()
            if (opts.issues) throw new Error("Invalid input")
            expectTypeOf(opts.value).toEqualTypeOf<
              NonNullable<SelectArrayOptions>
            >()
            count++
            const answer = await next()
            expectTypeOf(answer).toEqualTypeOf<
              (typeof sqliteSchemas.user.$inferSelect)[]
            >()
            return answer
          },
        ],
      })

      await query.resolve({})
      expect(count).toBe(1)
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
        await query.resolve({
          orderBy: [{ age: "asc" }],
        })
      ).toMatchObject({ age: 10 })
    })

    it("should resolve correctly with filters", async () => {
      const query = userFactory.selectSingleQuery()
      expect(
        await query.resolve({
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

      expect(query).toBeDefined()
      expect(await query.resolve({ age: 10 })).toMatchObject({ age: 10 })
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
              NonNullable<SelectSingleOptions>
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

      await query.resolve({})
      expect(count).toBe(1)
    })
  })

  describe("relationField", () => {
    afterAll(async () => {
      await db.delete(sqliteSchemas.studentCourseGrade)
      await db.delete(sqliteSchemas.studentToCourse)
      await db.delete(sqliteSchemas.course)
      await db.delete(sqliteSchemas.post)
    })

    it("should be created without error", () => {
      const postsField = userFactory.relationField("posts")
      expect(postsField).toBeDefined()

      const postFactory = DrizzleResolverFactory.create(db, "post")
      const authorField = postFactory.relationField("author")
      expect(authorField).toBeDefined()
    })

    it("should resolve correctly", async () => {
      const studentCourseFactory = DrizzleResolverFactory.create(
        db,
        "studentToCourse"
      )
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
          return gradeField.resolve(sc, undefined)
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

      await db.insert(sqliteSchemas.post).values([
        { authorId: John.id, title: "Hello" },
        { authorId: John.id, title: "World" },
      ])
      const postsField = userFactory.relationField("posts")
      answer = await postsField.resolve(John, undefined)
      expect(answer).toMatchObject([
        { authorId: John.id, title: "Hello" },
        { authorId: John.id, title: "World" },
      ])
    })
  })

  describe("resolver", () => {
    it("should be created without error", () => {
      const userResolver = userFactory.resolver()
      expect(userResolver).toBeDefined()
      expect(userResolver.user).toBeDefined()
      expect(userResolver.userSingle).toBeDefined()
      expect(userResolver.insertIntoUser).toBeDefined()
      expect(userResolver.insertIntoUserSingle).toBeDefined()
      expect(userResolver.updateUser).toBeDefined()
      expect(userResolver.deleteFromUser).toBeDefined()
      expect(userResolver.courses).toBeDefined()
      expect(userResolver.posts).toBeDefined()
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
    userFactory = DrizzleResolverFactory.create(db, "drizzle_user")
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
        await mutation.resolve({
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
  })

  describe("insertSingleMutation", () => {
    it("should be created without error", async () => {
      const mutation = userFactory.insertSingleMutation()
      expect(mutation).toBeDefined()
    })

    it("should resolve correctly", async () => {
      const mutation = userFactory.insertSingleMutation()
      const answer = await mutation.resolve({
        value: { name: "John", age: 7 },
      })
      expect(answer).toMatchObject({ isSuccess: true })

      await db.delete(mysqlSchemas.user).where(eq(mysqlSchemas.user.age, 7))
    })
  })

  describe("updateMutation", () => {
    it("should be created without error", async () => {
      const mutation = userFactory.updateMutation()
      expect(mutation).toBeDefined()
    })

    it("should resolve correctly", async () => {
      await db.insert(mysqlSchemas.user).values({ name: "Bob", age: 18 })
      const mutation = userFactory.updateMutation()
      expect(
        await mutation.resolve({
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
    it("should be created without error", async () => {
      const mutation = userFactory.deleteMutation()
      expect(mutation).toBeDefined()
    })

    it("should resolve correctly", async () => {
      await db.insert(mysqlSchemas.user).values({ name: "Alice", age: 18 })
      try {
        const mutation = userFactory.deleteMutation()
        const answer = await mutation.resolve({
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
    userFactory = DrizzleResolverFactory.create(db, "drizzle_user")
    await db.execute(sql`select 1`)
  })

  describe("insertArrayMutation", () => {
    it("should be created without error", async () => {
      const mutation = userFactory.insertArrayMutation()
      expect(mutation).toBeDefined()
    })

    it("should resolve correctly", async () => {
      const mutation = userFactory.insertArrayMutation()
      const answer = await mutation.resolve({
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
  })

  describe("insertSingleMutation", () => {
    it("should be created without error", async () => {
      const mutation = userFactory.insertSingleMutation()
      expect(mutation).toBeDefined()
    })

    it("should resolve correctly", async () => {
      const mutation = userFactory.insertSingleMutation()
      const answer = await mutation.resolve({
        value: { name: "John", age: 7 },
      })

      expect(answer).toMatchObject({ name: "John", age: 7 })

      await db.delete(pgSchemas.user).where(eq(pgSchemas.user.id, answer!.id))
    })
  })

  describe("updateMutation", () => {
    it("should be created without error", async () => {
      const mutation = userFactory.updateMutation()
      expect(mutation).toBeDefined()
    })

    it("should resolve correctly", async () => {
      await db.insert(pgSchemas.user).values({ name: "Bob", age: 18 })
      try {
        const mutation = userFactory.updateMutation()
        const answer = await mutation.resolve({
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
    it("should be created without error", async () => {
      const mutation = userFactory.deleteMutation()
      expect(mutation).toBeDefined()
    })

    it("should resolve correctly", async () => {
      await db.insert(pgSchemas.user).values({ name: "Alice", age: 18 })
      try {
        const mutation = userFactory.deleteMutation()
        const answer = await mutation.resolve({
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

    userFactory = DrizzleResolverFactory.create(db, "user")
  })

  describe("insertArrayMutation", () => {
    it("should be created without error", async () => {
      const mutation = userFactory.insertArrayMutation()
      expect(mutation).toBeDefined()
    })

    it("should resolve correctly", async () => {
      const mutation = userFactory.insertArrayMutation()

      const answer = await mutation.resolve({
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
    it("should be created without error", async () => {
      const mutation = userFactory.insertSingleMutation()
      expect(mutation).toBeDefined()
    })

    it("should resolve correctly", async () => {
      const mutation = userFactory.insertSingleMutation()
      const answer = await mutation.resolve({
        value: { name: "John", age: 7 },
      })
      expect(answer).toMatchObject({ name: "John", age: 7 })

      await db
        .delete(sqliteSchemas.user)
        .where(eq(sqliteSchemas.user.id, answer!.id))
    })
  })

  describe("updateMutation", () => {
    it("should be created without error", async () => {
      const mutation = userFactory.updateMutation()
      expect(mutation).toBeDefined()
    })

    it("should resolve correctly", async () => {
      await db.insert(sqliteSchemas.user).values({ name: "Bob", age: 18 })
      try {
        const mutation = userFactory.updateMutation()
        const answer = await mutation.resolve({
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
    it("should be created without error", async () => {
      const mutation = userFactory.deleteMutation()
      expect(mutation).toBeDefined()
    })

    it("should resolve correctly", async () => {
      await db.insert(sqliteSchemas.user).values({ name: "Alice", age: 18 })
      try {
        const mutation = userFactory.deleteMutation()
        const answer = await mutation.resolve({
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
