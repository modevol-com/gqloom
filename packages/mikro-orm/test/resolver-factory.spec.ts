import { resolver, weave } from "@gqloom/core"
import {
  EntitySchema,
  MikroORM,
  QueryOrder,
  RequestContext,
  defineConfig,
} from "@mikro-orm/libsql"
import { printSchema } from "graphql"
import * as v from "valibot"
import { beforeAll, describe, expect, expectTypeOf, it } from "vitest"
import { mikroSilk } from "../src"
import { type FindByCursorOutput, MikroResolverFactory } from "../src/factory"

interface IUser {
  id: number
  name: string
  email: string
  age?: number | null
}

const User = mikroSilk(
  new EntitySchema<IUser>({
    name: "User",
    properties: {
      id: { type: "number", primary: true },
      name: { type: "string" },
      email: { type: "string" },
      age: { type: "number", nullable: true },
    },
  })
)

const ORMConfig = defineConfig({
  entities: [User],
  dbName: ":memory:",
  allowGlobalContext: true,
})

describe.concurrent("MikroResolverFactory", async () => {
  let orm: MikroORM
  beforeAll(async () => {
    orm = await MikroORM.init(ORMConfig)
    await orm.getSchemaGenerator().updateSchema()

    // Create test data
    await RequestContext.create(orm.em, async () => {
      const users = [
        orm.em.create(User, {
          name: "John Doe",
          email: "john@example.com",
          age: 25,
        }),
        orm.em.create(User, {
          name: "Jane Doe",
          email: "jane@example.com",
          age: 30,
        }),
        orm.em.create(User, {
          name: "Bob Smith",
          email: "bob@example.com",
          age: 20,
        }),
        orm.em.create(User, {
          name: "Alice Johnson",
          email: "alice@example.com",
          age: 35,
        }),
        orm.em.create(User, {
          name: "Charlie Brown",
          email: "charlie@example.com",
          age: 28,
        }),
      ]
      await orm.em.persistAndFlush(users)
    })
  })

  const userFactory = new MikroResolverFactory(User, () => orm.em)

  describe.concurrent("countQuery", () => {
    it("should be created without error", async () => {
      const query = userFactory.countQuery()
      expect(query).toBeDefined()
    })

    it("should resolve correctly with filters", async () => {
      const query = userFactory.countQuery()
      const executor = resolver({ query }).toExecutor()
      let answer

      answer = await executor.query({})
      expect(answer).toBe(5)

      answer = await executor.query({
        where: { age: { gte: 30 } },
      })
      expect(answer).toBe(2)

      answer = await executor.query({
        where: { age: { lt: 30 } },
      })
      expect(answer).toBe(3)

      answer = await executor.query({
        where: { age: { in: [25, 30] } },
      })
      expect(answer).toBe(2)

      answer = await executor.query({
        where: { name: { like: "J%" } },
      })
      expect(answer).toBe(2)
    })

    it("should be created with custom input", async () => {
      const query = userFactory.countQuery({
        input: v.pipe(
          v.object({
            age: v.nullish(v.number()),
          }),
          v.transform(({ age }) => ({
            where: age != null ? { age: { $eq: age } } : undefined,
          }))
        ),
      })

      expect(query).toBeDefined()
      const executor = resolver({ query }).toExecutor()
      expect(await executor.query({ age: 25 })).toBe(1)
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

    it("should weave schema without error", async () => {
      const r = resolver({ countQuery: userFactory.countQuery() })
      const schema = weave(r)
      await expect(printSchema(schema)).toMatchFileSnapshot(
        "./snapshots/countQuery.graphql"
      )
    })
  })

  describe.concurrent("findQuery", () => {
    it("should be created without error", async () => {
      const query = userFactory.findQuery()
      expect(query).toBeDefined()
    })

    it("should resolve correctly with filters, sorting, and pagination", async () => {
      const query = userFactory.findQuery()
      const executor = resolver({ query }).toExecutor()
      let answer: IUser[]

      // No args
      answer = await executor.query({})
      expect(answer).toHaveLength(5)

      // Where
      answer = await executor.query({
        where: { age: { gte: 30 } },
      })
      expect(answer).toHaveLength(2)
      expect(answer.map((u) => u.name).sort()).toEqual([
        "Alice Johnson",
        "Jane Doe",
      ])

      // OrderBy
      answer = await executor.query({
        orderBy: { age: "DESC" },
      })
      expect(answer.map((u) => u.name)).toEqual([
        "Alice Johnson",
        "Jane Doe",
        "Charlie Brown",
        "John Doe",
        "Bob Smith",
      ])

      // Limit
      answer = await executor.query({
        limit: 2,
        orderBy: { age: "ASC" },
      })
      expect(answer).toHaveLength(2)
      expect(answer.map((u) => u.name)).toEqual(["Bob Smith", "John Doe"])

      // Offset
      answer = await executor.query({
        limit: 2,
        offset: 2,
        orderBy: { age: "ASC" },
      })
      expect(answer).toHaveLength(2)
      expect(answer.map((u) => u.name)).toEqual(["Charlie Brown", "Jane Doe"])
    })

    it("should be created with custom input", async () => {
      const query = userFactory.findQuery({
        input: v.pipe(
          v.object({
            minAge: v.nullish(v.number()),
          }),
          v.transform(({ minAge }) => ({
            where: minAge != null ? { age: { $gte: minAge } } : {},
            orderBy: { age: QueryOrder.ASC },
          }))
        ),
      })

      expect(query).toBeDefined()
      const executor = resolver({ query }).toExecutor()
      let answer: IUser[]
      answer = await executor.query({ minAge: 30 })
      expect(answer).toHaveLength(2)
      expect(answer.map((u) => u.name)).toEqual(["Jane Doe", "Alice Johnson"])

      answer = await executor.query({ minAge: null })
      expect(answer).toHaveLength(5)
    })

    it("should be created with middlewares", async () => {
      let count = 0
      const query = userFactory.findQuery({
        middlewares: [
          async ({ parseInput, next }) => {
            const opts = await parseInput()
            if (opts.issues) throw new Error("Invalid input")
            count++
            const answer = await next()
            expectTypeOf(answer).toEqualTypeOf<IUser[]>()
            return answer.map((u) => ({ ...u, name: u.name.toUpperCase() }))
          },
        ],
      })

      const executor = resolver({ query }).toExecutor()
      const answer = await executor.query({})
      expect(count).toBe(1)
      expect(answer.find((u) => u.id === 1)?.name).toBe("JOHN DOE")
    })

    it("should weave schema without error", async () => {
      const r = resolver({ findQuery: userFactory.findQuery() })
      const schema = weave(r)
      await expect(printSchema(schema)).toMatchFileSnapshot(
        "./snapshots/findQuery.graphql"
      )
    })
  })

  describe.concurrent("findAndCountQuery", () => {
    it("should be created without error", async () => {
      const query = userFactory.findAndCountQuery()
      expect(query).toBeDefined()
    })

    it("should resolve correctly with filters, sorting, and pagination", async () => {
      const query = userFactory.findAndCountQuery()
      const executor = resolver({ query }).toExecutor()
      let answer: { items: IUser[]; totalCount: number }

      // No args
      answer = await executor.query({})
      expect(answer.items).toHaveLength(5)
      expect(answer.totalCount).toBe(5)

      // Where
      answer = await executor.query({
        where: { age: { gte: 30 } },
      })
      expect(answer.items).toHaveLength(2)
      expect(answer.totalCount).toBe(2)
      expect(answer.items.map((u) => u.name).sort()).toEqual([
        "Alice Johnson",
        "Jane Doe",
      ])

      // OrderBy
      answer = await executor.query({
        orderBy: { age: "DESC" },
      })
      expect(answer.items).toHaveLength(5)
      expect(answer.totalCount).toBe(5)
      expect(answer.items.map((u) => u.name)).toEqual([
        "Alice Johnson",
        "Jane Doe",
        "Charlie Brown",
        "John Doe",
        "Bob Smith",
      ])

      // Limit
      answer = await executor.query({
        limit: 2,
        orderBy: { age: "ASC" },
      })
      expect(answer.items).toHaveLength(2)
      expect(answer.totalCount).toBe(5) // Limit only affects items, not total count
      expect(answer.items.map((u) => u.name)).toEqual(["Bob Smith", "John Doe"])

      // Offset
      answer = await executor.query({
        limit: 2,
        offset: 2,
        orderBy: { age: "ASC" },
      })
      expect(answer.items).toHaveLength(2)
      expect(answer.totalCount).toBe(5) // Offset only affects items, not total count
      expect(answer.items.map((u) => u.name)).toEqual([
        "Charlie Brown",
        "Jane Doe",
      ])
    })

    it("should be created with custom input", async () => {
      const query = userFactory.findAndCountQuery({
        input: v.pipe(
          v.object({
            minAge: v.nullish(v.number()),
          }),
          v.transform(({ minAge }) => ({
            where: minAge != null ? { age: { $gte: minAge } } : {},
            orderBy: { age: QueryOrder.ASC },
          }))
        ),
      })

      expect(query).toBeDefined()
      const executor = resolver({ query }).toExecutor()
      let answer: { items: IUser[]; totalCount: number }
      answer = await executor.query({ minAge: 30 })
      expect(answer.items).toHaveLength(2)
      expect(answer.totalCount).toBe(2)
      expect(answer.items.map((u) => u.name)).toEqual([
        "Jane Doe",
        "Alice Johnson",
      ])

      answer = await executor.query({ minAge: null })
      expect(answer.items).toHaveLength(5)
      expect(answer.totalCount).toBe(5)
    })

    it("should be created with middlewares", async () => {
      let count = 0
      const query = userFactory.findAndCountQuery({
        middlewares: [
          async ({ parseInput, next }) => {
            const opts = await parseInput()
            if (opts.issues) throw new Error("Invalid input")
            count++
            const answer = await next()
            expectTypeOf(answer).toEqualTypeOf<{
              items: IUser[]
              totalCount: number
            }>()
            return {
              ...answer,
              items: answer.items.map((u) => ({
                ...u,
                name: u.name.toUpperCase(),
              })),
            }
          },
        ],
      })

      const executor = resolver({ query }).toExecutor()
      const answer = await executor.query({})
      expect(count).toBe(1)
      expect(answer.items.find((u) => u.id === 1)?.name).toBe("JOHN DOE")
      expect(answer.totalCount).toBe(5)
    })

    it("should weave schema without error", async () => {
      const r = resolver({
        findAndCountQuery: userFactory.findAndCountQuery(),
      })
      const schema = weave(r)
      await expect(printSchema(schema)).toMatchFileSnapshot(
        "./snapshots/findAndCountQuery.graphql"
      )
    })
  })

  describe.concurrent("findByCursorQuery", () => {
    it("should be created without error", async () => {
      const query = userFactory.findByCursorQuery()
      expect(query).toBeDefined()
    })

    it("should resolve correctly with filters, sorting, and pagination", async () => {
      const query = userFactory.findByCursorQuery()
      const executor = resolver({ query }).toExecutor()
      let answer: FindByCursorOutput<IUser>

      // No args
      answer = await executor.query({ orderBy: { id: "ASC" } })
      expect(answer.items).toHaveLength(5)
      expect(answer.totalCount).toBe(5)
      expect(answer.hasNextPage).toBe(false)
      expect(answer.hasPrevPage).toBe(false)

      // Forward pagination
      answer = await executor.query({
        first: 2,
        orderBy: { age: "ASC" },
      })
      expect(answer.items.map((u) => u.name)).toEqual(["Bob Smith", "John Doe"])
      expect(answer.totalCount).toBe(5)
      expect(answer.hasNextPage).toBe(true)
      expect(answer.hasPrevPage).toBe(false)
      expect(answer.startCursor).toBeDefined()
      expect(answer.endCursor).toBeDefined()

      const after = answer.endCursor!

      answer = await executor.query({
        first: 2,
        after,
        orderBy: { age: "ASC" },
      })
      expect(answer.items.map((u) => u.name)).toEqual([
        "Charlie Brown",
        "Jane Doe",
      ])
      expect(answer.totalCount).toBe(5)
      expect(answer.hasNextPage).toBe(true)
      expect(answer.hasPrevPage).toBe(true)

      const after2 = answer.endCursor!

      answer = await executor.query({
        first: 2,
        after: after2,
        orderBy: { age: "ASC" },
      })
      expect(answer.items.map((u) => u.name)).toEqual(["Alice Johnson"])
      expect(answer.totalCount).toBe(5)
      expect(answer.hasNextPage).toBe(false)
      expect(answer.hasPrevPage).toBe(true)

      // Backward pagination
      answer = await executor.query({
        last: 2,
        orderBy: { age: "ASC" },
      })
      expect(answer.items.map((u) => u.name)).toEqual([
        "Jane Doe",
        "Alice Johnson",
      ])
      expect(answer.totalCount).toBe(5)
      expect(answer.hasNextPage).toBe(false)
      expect(answer.hasPrevPage).toBe(true)

      const before = answer.startCursor!

      answer = await executor.query({
        last: 2,
        before,
        orderBy: { age: "ASC" },
      })
      expect(answer.items.map((u) => u.name)).toEqual([
        "John Doe",
        "Charlie Brown",
      ])
      expect(answer.totalCount).toBe(5)
      expect(answer.hasNextPage).toBe(true)
      expect(answer.hasPrevPage).toBe(true)

      // Where clause
      answer = await executor.query({
        where: { age: { gte: 30 } },
        orderBy: { age: "ASC" },
      })
      expect(answer.items.map((u) => u.name)).toEqual([
        "Jane Doe",
        "Alice Johnson",
      ])
      expect(answer.totalCount).toBe(2)
      expect(answer.hasNextPage).toBe(false)
      expect(answer.hasPrevPage).toBe(false)
    })

    it("should be created with custom input", async () => {
      const query = userFactory.findByCursorQuery({
        input: v.pipe(
          v.object({
            minAge: v.nullish(v.number()),
            first: v.optional(v.number(), 2),
          }),
          v.transform(({ minAge, first }) => ({
            where: minAge != null ? { age: { $gte: minAge } } : {},
            orderBy: { age: QueryOrder.ASC },
            first,
          }))
        ),
      })

      expect(query).toBeDefined()
      const executor = resolver({ query }).toExecutor()
      let answer: FindByCursorOutput<IUser>
      answer = await executor.query({ minAge: 30 })
      expect(answer.items).toHaveLength(2)
      expect(answer.totalCount).toBe(2)
      expect(answer.items.map((u) => u.name)).toEqual([
        "Jane Doe",
        "Alice Johnson",
      ])

      answer = await executor.query({ minAge: null })
      expect(answer.items).toHaveLength(2)
      expect(answer.totalCount).toBe(5)
    })

    it("should be created with middlewares", async () => {
      let count = 0
      const query = userFactory.findByCursorQuery({
        middlewares: [
          async ({ parseInput, next }) => {
            const opts = await parseInput()
            if (opts.issues) throw new Error("Invalid input")
            count++
            const answer = await next()
            expectTypeOf(answer).toEqualTypeOf<FindByCursorOutput<IUser>>()
            const items: IUser[] = answer.items.map((u) => ({
              ...u,
              name: u.name.toUpperCase(),
            }))
            return {
              ...answer,
              items,
            }
          },
        ],
      })

      const executor = resolver({ query }).toExecutor()
      const answer = await executor.query({ first: 1, orderBy: { id: "ASC" } })
      expect(count).toBe(1)
      expect(answer.items.find((u) => u.id === 1)?.name).toBe("JOHN DOE")
      expect(answer.totalCount).toBe(5)
    })

    it("should weave schema without error", async () => {
      const r = resolver({
        findByCursorQuery: userFactory.findByCursorQuery(),
      })
      const schema = weave(r)
      await expect(printSchema(schema)).toMatchFileSnapshot(
        "./snapshots/findByCursorQuery.graphql"
      )
    })
  })

  describe.concurrent("findOneQuery", () => {
    it("should be created without error", async () => {
      const query = userFactory.findOneQuery()
      expect(query).toBeDefined()
    })

    it("should resolve correctly with filters, sorting, and offset", async () => {
      const query = userFactory.findOneQuery()
      const executor = resolver({ query }).toExecutor()
      let answer: IUser | null

      // No args (should return first by default order or undefined)
      answer = await executor.query({
        orderBy: { id: "ASC" },
        where: { id: { gte: 1 } },
      })
      expect(answer?.name).toBe("John Doe")

      // Where
      answer = await executor.query({
        where: { name: { eq: "Jane Doe" } },
      })
      expect(answer?.name).toBe("Jane Doe")

      // OrderBy
      answer = await executor.query({
        orderBy: { age: "DESC" },
        where: { id: { gte: 1 } }, // 添加一个有效的 where 条件
      })
      expect(answer?.name).toBe("Alice Johnson")

      // Offset
      answer = await executor.query({
        offset: 1,
        orderBy: { age: "ASC" },
        where: { id: { gte: 1 } }, // 添加一个有效的 where 条件
      })
      expect(answer?.name).toBe("John Doe")

      // No match
      answer = await executor.query({
        where: { name: { eq: "Non Existent" } },
      })
      expect(answer).toBeNull()
    })

    it("should be created with custom input", async () => {
      const query = userFactory.findOneQuery({
        input: v.pipe(
          v.object({
            userName: v.string(),
          }),
          v.transform(({ userName }) => ({
            where: { name: { $eq: userName } },
          }))
        ),
      })

      expect(query).toBeDefined()
      const executor = resolver({ query }).toExecutor()
      let answer: IUser | null
      answer = await executor.query({ userName: "Bob Smith" })
      expect(answer?.name).toBe("Bob Smith")

      answer = await executor.query({ userName: "Non Existent" })
      expect(answer).toBeNull()
    })

    it("should be created with middlewares", async () => {
      let count = 0
      const query = userFactory.findOneQuery({
        middlewares: [
          async ({ parseInput, next }) => {
            const opts = await parseInput()
            if (opts.issues) throw new Error("Invalid input")
            count++
            const answer = await next()
            expectTypeOf(answer).toEqualTypeOf<IUser | null>()
            return answer
              ? { ...answer, name: answer.name.toUpperCase() }
              : null
          },
        ],
      })

      const executor = resolver({ query }).toExecutor()
      const answer = await executor.query({ where: { id: { eq: 1 } } })
      expect(count).toBe(1)
      expect(answer?.name).toBe("JOHN DOE")
    })

    it("should weave schema without error", async () => {
      const r = resolver({ findOneQuery: userFactory.findOneQuery() })
      const schema = weave(r)
      await expect(printSchema(schema)).toMatchFileSnapshot(
        "./snapshots/findOneQuery.graphql"
      )
    })
  })

  describe.concurrent("findOneOrFailQuery", () => {
    it("should be created without error", async () => {
      const query = userFactory.findOneOrFailQuery()
      expect(query).toBeDefined()
    })

    it("should resolve correctly with filters, sorting, and offset", async () => {
      const query = userFactory.findOneOrFailQuery()
      const executor = resolver({ query }).toExecutor()
      let answer: IUser

      // Where
      answer = await executor.query({
        where: { name: { eq: "Jane Doe" } },
      })
      expect(answer.name).toBe("Jane Doe")

      // OrderBy
      answer = await executor.query({
        orderBy: { age: "DESC" },
        where: { id: { gte: 1 } }, // 添加一个有效的 where 条件
      })
      expect(answer.name).toBe("Alice Johnson")

      // Offset
      answer = await executor.query({
        offset: 1,
        orderBy: { age: "ASC" },
        where: { id: { gte: 1 } }, // 添加一个有效的 where 条件
      })
      expect(answer.name).toBe("John Doe")
    })

    it("should throw an error if no entity is found", async () => {
      const query = userFactory.findOneOrFailQuery()
      const executor = resolver({ query }).toExecutor()
      await expect(
        executor.query({ where: { name: { eq: "Non Existent" } } })
      ).rejects.toThrow("User not found ({ name: { '$eq': 'Non Existent' } })") // 更新错误信息
    })

    it("should be created with custom input", async () => {
      const query = userFactory.findOneOrFailQuery({
        input: v.pipe(
          v.object({
            userName: v.string(),
          }),
          v.transform(({ userName }) => ({
            where: { name: { $eq: userName } },
          }))
        ),
      })

      expect(query).toBeDefined()
      const executor = resolver({ query }).toExecutor()
      const answer = await executor.query({ userName: "Bob Smith" })
      expect(answer.name).toBe("Bob Smith")

      await expect(
        executor.query({ userName: "Non Existent" })
      ).rejects.toThrow("User not found ({ name: { '$eq': 'Non Existent' } })") // 更新错误信息
    })

    it("should be created with middlewares", async () => {
      let count = 0
      const query = userFactory.findOneOrFailQuery({
        middlewares: [
          async ({ parseInput, next }) => {
            const opts = await parseInput()
            if (opts.issues) throw new Error("Invalid input")
            count++
            const answer = await next()
            expectTypeOf(answer).toEqualTypeOf<IUser>()
            return { ...answer, name: answer.name.toUpperCase() }
          },
        ],
      })

      const executor = resolver({ query }).toExecutor()
      const answer = await executor.query({ where: { id: { eq: 1 } } })
      expect(count).toBe(1)
      expect(answer.name).toBe("JOHN DOE")
    })

    it("should weave schema without error", async () => {
      const r = resolver({
        findOneOrFailQuery: userFactory.findOneOrFailQuery(),
      })
      const schema = weave(r)
      await expect(printSchema(schema)).toMatchFileSnapshot(
        "./snapshots/findOneOrFailQuery.graphql"
      )
    })
  })

  describe.concurrent("createMutation", () => {
    let orm: MikroORM
    let userFactory: MikroResolverFactory<IUser>
    beforeAll(async () => {
      orm = await MikroORM.init(ORMConfig)
      await orm.getSchemaGenerator().updateSchema()
      userFactory = new MikroResolverFactory(User, () => orm.em)
    })
    it("should be created without error", async () => {
      const mutation = userFactory.createMutation()
      expect(mutation).toBeDefined()
    })

    it("should create entity correctly", async () => {
      const create = userFactory.createMutation()
      const executor = resolver({ create }).toExecutor()
      const answer = await executor.create({
        data: { name: "John Doe", email: "john@example.com", age: 25 },
      })
      expect(answer.name).toBe("John Doe")
      expect(answer.email).toBe("john@example.com")
      expect(answer.age).toBe(25)

      const fromDB = await orm.em.findOne(User, answer.id)
      expect(fromDB).toBeDefined()
    })

    it("should use with middlewares", async () => {
      let count = 0
      const create = userFactory.createMutation({
        middlewares: [
          async ({ parseInput, next }) => {
            const opts = await parseInput()
            if (opts.issues) throw new Error("Invalid input")
            count++
            const answer = await next()
            expectTypeOf(answer).toEqualTypeOf<IUser>()
            return { ...answer, name: answer.name.toUpperCase() }
          },
        ],
      })

      const executor = resolver({ create }).toExecutor()
      const answer = await executor.create({
        data: { name: "John Doe", email: "john@example.com", age: 25 },
      })
      expect(count).toBe(1)
      expect(answer.name).toBe("JOHN DOE")

      const fromDB = await orm.em.findOne(User, answer.id)
      expect(fromDB?.name).toBe("John Doe")
    })

    it("should use with custom input", async () => {
      const create = userFactory.createMutation({
        input: v.pipe(
          v.object({
            username: v.string(),
            email: v.string(),
          }),
          v.transform(({ username, email }) => ({
            data: { name: username.toUpperCase(), email, age: 30 },
          }))
        ),
      })

      const executor = resolver({ create }).toExecutor()
      const answer = await executor.create({
        username: "john doe",
        email: "john.doe@example.com",
      })

      expect(answer.name).toBe("JOHN DOE")
      expect(answer.email).toBe("john.doe@example.com")
      expect(answer.age).toBe(30)

      const fromDB = await orm.em.findOne(User, answer.id)
      expect(fromDB?.name).toBe("JOHN DOE")
      expect(fromDB?.email).toBe("john.doe@example.com")
      expect(fromDB?.age).toBe(30)
    })

    it("should weave schema without error", async () => {
      const r = resolver({
        createMutation: userFactory.createMutation(),
      })
      const schema = weave(r)
      await expect(printSchema(schema)).toMatchFileSnapshot(
        "./snapshots/createMutation.graphql"
      )
    })
  })

  describe.concurrent("insertMutation", () => {
    let orm: MikroORM
    let userFactory: MikroResolverFactory<IUser>
    beforeAll(async () => {
      orm = await MikroORM.init(ORMConfig)
      await orm.getSchemaGenerator().updateSchema()
      userFactory = new MikroResolverFactory(User, () => orm.em)
    })
    it("should be created without error", async () => {
      const mutation = userFactory.insertMutation()
      expect(mutation).toBeDefined()
    })

    it("should create entity correctly", async () => {
      const insert = userFactory.insertMutation()
      const executor = resolver({ insert }).toExecutor()
      const answer = await executor.insert({
        data: { name: "John Doe", email: "john@example.com", age: 25 },
      })
      expect(answer.name).toBe("John Doe")
      expect(answer.email).toBe("john@example.com")
      expect(answer.age).toBe(25)

      const fromDB = await orm.em.findOne(User, answer.id)
      expect(fromDB).toBeDefined()
    })

    it("should use with middlewares", async () => {
      let count = 0
      const insert = userFactory.insertMutation({
        middlewares: [
          async ({ parseInput, next }) => {
            const opts = await parseInput()
            if (opts.issues) throw new Error("Invalid input")
            count++
            const answer = await next()
            expectTypeOf(answer).toEqualTypeOf<IUser>()
            return { ...answer, name: answer.name.toUpperCase() }
          },
        ],
      })

      const executor = resolver({ insert }).toExecutor()
      const answer = await executor.insert({
        data: { name: "Jane Doe", email: "jane@example.com", age: 25 },
      })
      expect(count).toBe(1)
      expect(answer.name).toBe("JANE DOE")

      const fromDB = await orm.em.findOne(User, answer.id)
      expect(fromDB?.name).toBe("Jane Doe")
    })

    it("should use with custom input", async () => {
      const insert = userFactory.insertMutation({
        input: v.pipe(
          v.object({
            username: v.string(),
            email: v.string(),
          }),
          v.transform(({ username, email }) => ({
            data: { name: username.toUpperCase(), email, age: 30 },
          }))
        ),
      })

      const executor = resolver({ insert }).toExecutor()
      const answer = await executor.insert({
        username: "jane doe",
        email: "jane.doe@example.com",
      })

      expect(answer.name).toBe("JANE DOE")
      expect(answer.email).toBe("jane.doe@example.com")
      expect(answer.age).toBe(30)

      const fromDB = await orm.em.findOne(User, answer.id)
      expect(fromDB?.name).toBe("JANE DOE")
      expect(fromDB?.email).toBe("jane.doe@example.com")
      expect(fromDB?.age).toBe(30)
    })

    it("should weave schema without error", async () => {
      const r = resolver({
        insertMutation: userFactory.insertMutation(),
      })
      const schema = weave(r)
      await expect(printSchema(schema)).toMatchFileSnapshot(
        "./snapshots/insertMutation.graphql"
      )
    })
  })

  describe.concurrent("insertManyMutation", () => {
    let orm: MikroORM
    let userFactory: MikroResolverFactory<IUser>
    beforeAll(async () => {
      orm = await MikroORM.init(ORMConfig)
      await orm.getSchemaGenerator().updateSchema()
      userFactory = new MikroResolverFactory(User, () => orm.em)
    })
    it("should be created without error", async () => {
      const mutation = userFactory.insertManyMutation()
      expect(mutation).toBeDefined()
    })

    it("should create entities correctly", async () => {
      const insertMany = userFactory.insertManyMutation()
      const executor = resolver({ insertMany }).toExecutor()

      const answer = await executor.insertMany({
        data: [{ name: "User 1", email: "user1@example.com", age: 21 }],
      })

      expect(answer).toHaveLength(1)
      expect(answer[0].name).toBe("User 1")
      expect(answer[0].email).toBe("user1@example.com")
      expect(answer[0].age).toBe(21)

      const fromDB = await orm.em.find(User, {
        id: answer.map((u) => u.id),
      })
      expect(fromDB).toHaveLength(1)
      expect(fromDB[0].name).toBe("User 1")
      expect(fromDB[0].email).toBe("user1@example.com")
      expect(fromDB[0].age).toBe(21)
    })

    it("should use with middlewares", async () => {
      let count = 0
      const insertMany = userFactory.insertManyMutation({
        middlewares: [
          async ({ parseInput, next }) => {
            const opts = await parseInput()
            if (opts.issues) throw new Error("Invalid input")
            count++
            const answer = await next()
            expectTypeOf(answer).toEqualTypeOf<IUser[]>()
            return answer.map((a: IUser) => ({
              ...a,
              name: a.name.toUpperCase(),
            }))
          },
        ],
      })

      const executor = resolver({ insertMany }).toExecutor()
      const answer = await executor.insertMany({
        data: [{ name: "User 3", email: "user3@example.com", age: 23 }],
      })
      expect(count).toBe(1)
      expect(answer[0].name).toBe("USER 3")

      const fromDB = await orm.em.find(User, {
        id: { $in: answer.map((u: IUser) => u.id) },
      })
      expect(fromDB).toHaveLength(1)
      expect(fromDB[0].name).toBe("User 3")
    })

    it("should use with custom input", async () => {
      const insertMany = userFactory.insertManyMutation({
        input: v.pipe(
          v.object({
            users: v.array(
              v.object({
                username: v.string(),
                email: v.string(),
              })
            ),
          }),
          v.transform(({ users }) => ({
            data: users.map((u) => ({
              name: u.username.toUpperCase(),
              email: u.email,
              age: 30,
            })),
          }))
        ),
      })

      const executor = resolver({ insertMany }).toExecutor()
      const answer = await executor.insertMany({
        users: [{ username: "user 5", email: "user5@example.com" }],
      })

      expect(answer).toHaveLength(1)
      expect(answer[0].name).toBe("USER 5")

      const fromDB = await orm.em.find(User, {
        id: { $in: answer.map((u: IUser) => u.id) },
      })
      expect(fromDB).toHaveLength(1)
      expect(fromDB[0].name).toBe("USER 5")
    })

    it("should weave schema without error", async () => {
      const r = resolver({
        insertManyMutation: userFactory.insertManyMutation(),
      })
      const schema = weave(r)
      await expect(printSchema(schema)).toMatchFileSnapshot(
        "./snapshots/insertManyMutation.graphql"
      )
    })
  })

  describe.concurrent("deleteMutation", () => {
    let orm: MikroORM
    let userFactory: MikroResolverFactory<IUser>
    beforeAll(async () => {
      orm = await MikroORM.init(ORMConfig)
      await orm.getSchemaGenerator().updateSchema()
      userFactory = new MikroResolverFactory(User, () => orm.em)
    })

    it("should be created without error", async () => {
      const mutation = userFactory.deleteMutation()
      expect(mutation).toBeDefined()
    })

    it("should delete entity correctly", async () => {
      const deleteMutation = userFactory.deleteMutation()
      const executor = resolver({ delete: deleteMutation }).toExecutor()
      await orm.em.insert(User, {
        name: "u1",
        email: "user1@example.com",
        age: 21,
      })
      expect(await orm.em.findOne(User, { name: "u1" })).toBeDefined()
      const answer = await executor.delete({
        where: { name: { eq: "u1" } },
      })
      expect(answer).toBe(1)
      expect(await orm.em.findOne(User, { name: "u1" })).toBeNull()
    })

    it("should use with middlewares", async () => {
      let count = 0
      const deleteMutation = userFactory.deleteMutation({
        middlewares: [
          async ({ parseInput, next }) => {
            const opts = await parseInput()
            if (opts.issues) throw new Error("Invalid input")
            count++
            const answer = await next()
            expectTypeOf(answer).toEqualTypeOf<number>()
            return answer + 1
          },
        ],
      })
      const executor = resolver({ delete: deleteMutation }).toExecutor()

      await orm.em.insert(User, {
        name: "u2",
        email: "user2@example.com",
        age: 22,
      })
      const answer = await executor.delete({
        where: { name: { eq: "u2" } },
      })
      expect(count).toBe(1)
      expect(answer).toBe(2)
    })

    it("should use with custom input", async () => {
      const deleteMutation = userFactory.deleteMutation({
        input: v.pipe(
          v.object({
            username: v.string(),
          }),
          v.transform(({ username }) => ({
            where: { name: username },
          }))
        ),
      })
      const executor = resolver({ delete: deleteMutation }).toExecutor()

      await orm.em.insert(User, {
        name: "u4",
        email: "user3@example.com",
        age: 23,
      })
      const answer = await executor.delete({
        username: "u4",
      })
      expect(answer).toBe(1)
    })

    it("should weave schema without error", async () => {
      const r = resolver({
        deleteMutation: userFactory.deleteMutation(),
      })
      const schema = weave(r)
      await expect(printSchema(schema)).toMatchFileSnapshot(
        "./snapshots/deleteMutation.graphql"
      )
    })
  })

  describe.concurrent("updateMutation", () => {
    let orm: MikroORM
    let userFactory: MikroResolverFactory<IUser>
    beforeAll(async () => {
      orm = await MikroORM.init(ORMConfig)
      await orm.getSchemaGenerator().updateSchema()
      userFactory = new MikroResolverFactory(User, () => orm.em)
    })

    it("should be created without error", async () => {
      const mutation = userFactory.updateMutation()
      expect(mutation).toBeDefined()
    })

    it("should update entity correctly", async () => {
      const updateMutation = userFactory.updateMutation()
      const executor = resolver({ update: updateMutation }).toExecutor()

      await orm.em.insert(User, {
        name: "u5",
        email: "user5@example.com",
        age: 24,
      })
      const answer = await executor.update({
        where: { name: { eq: "u5" } },
        data: { age: 25 },
      })
      expect(answer).toBe(1)
      expect(await orm.em.findOne(User, { name: "u5" })).toBeDefined()
      expect((await orm.em.findOne(User, { name: "u5" }))?.age).toBe(25)
    })

    it("should use with middlewares", async () => {
      let count = 0
      const updateMutation = userFactory.updateMutation({
        middlewares: [
          async ({ parseInput, next }) => {
            const opts = await parseInput()
            if (opts.issues) throw new Error("Invalid input")
            count++
            const answer = await next()
            expectTypeOf(answer).toEqualTypeOf<number>()
            return answer + 1
          },
        ],
      })

      const executor = resolver({ update: updateMutation }).toExecutor()

      await orm.em.insert(User, {
        name: "u6",
        email: "user6@example.com",
        age: 26,
      })
      const answer = await executor.update({
        where: { name: { eq: "u6" } },
        data: { age: 27 },
      })
      expect(count).toBe(1)
      expect(answer).toBe(2)
      expect(await orm.em.findOne(User, { name: "u6" })).toBeDefined()
      expect((await orm.em.findOne(User, { name: "u6" }))?.age).toBe(27)
    })

    it("should use with custom input", async () => {
      const updateMutation = userFactory.updateMutation({
        input: v.pipe(
          v.object({
            username: v.string(),
          }),
          v.transform(({ username }) => ({
            where: { name: username },
            data: { age: 28 },
          }))
        ),
      })
      const executor = resolver({ update: updateMutation }).toExecutor()

      await orm.em.insert(User, {
        name: "u7",
        email: "user7@example.com",
        age: 29,
      })
      const answer = await executor.update({
        username: "u7",
      })
      expect(answer).toBe(1)
      expect(await orm.em.findOne(User, { name: "u7" })).toBeDefined()
      expect((await orm.em.findOne(User, { name: "u7" }))?.age).toBe(28)
    })

    it("should weave schema without error", async () => {
      const r = resolver({
        updateMutation: userFactory.updateMutation(),
      })
      const schema = weave(r)
      await expect(printSchema(schema)).toMatchFileSnapshot(
        "./snapshots/updateMutation.graphql"
      )
    })
  })
})
