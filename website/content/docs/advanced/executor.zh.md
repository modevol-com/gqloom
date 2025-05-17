---
title: 执行器
---

有时候我们想要直接调用解析器方法，而不是从头执行一个 GraphQL 查询，这个时候我们可以使用 `resolver().toExecutor()` 方法来创建一个执行器。

## 基础示例

```ts twoslash
import { resolver, query, field, mutation } from "@gqloom/core"
import * as v from "valibot"

export const Giraffe = v.object({
  __typename: v.nullish(v.literal("Giraffe")),
  id: v.number(),
  name: v.string(),
  birthDate: v.date(),
})

export interface IGiraffe extends v.InferOutput<typeof Giraffe> {}

const giraffes = new Map<number, IGiraffe>([
  [1, { id: 1, name: "Spotty", birthDate: new Date("2020-01-01") }],
  [2, { id: 2, name: "Longneck", birthDate: new Date("2020-01-02") }],
])

export const giraffeResolver = resolver.of(Giraffe, {
  giraffe: query(v.nullish(Giraffe))
    .input({ id: v.number() })
    .resolve(({ id }) => giraffes.get(id)),

  giraffes: query(v.array(Giraffe)).resolve(() =>
    Array.from(giraffes.values())
  ),

  createGiraffe: mutation(Giraffe)
    .input(
      v.object({
        name: v.string(),
        birthDate: v.nullish(v.date(), () => new Date()),
      })
    )
    .resolve(({ name, birthDate }) => {
      const id = giraffes.size + 1
      const giraffe = { id, name, birthDate }
      giraffes.set(id, giraffe)
      return giraffe
    }),
})

const giraffeExecutor = giraffeResolver.toExecutor()
const Aurora = giraffeExecutor.createGiraffe({ name: "Aurora" })

// @noErrors
giraffeExecutor.
//              ^|
```

## 上下文注入

通过 `createContext` 方法创建的上下文或 `createMemoization` 方法创建的记忆化上下文，都可以在创建执行器时注入不同的值。

```ts
const giraffeExecutor = giraffeResolver.toExecutor(
  asyncContextProvider.with(useCurrentUser.provide({ id: 9, roles: ["admin"] }))
)
```

## 单元测试

执行器很适合用于单元测试，以下是一个简单的单元测试示例：

```ts
import { giraffeResolver } from "./giraffe"
import { describe, it, expect } from "vitest"

describe("giraffeResolver", () => {
  const giraffeExecutor = giraffeResolver.toExecutor()
  it("should create a giraffe", async () => {
    const giraffe = await giraffeExecutor.createGiraffe({ name: "Aurora" })
    expect(giraffe).toBeDefined()
    expect(giraffe.name).toBe("Aurora")
  })

  it("should find giraffes", async () => {
    const giraffes = await giraffeExecutor.giraffes()
    expect(giraffes).toBeDefined()
    expect(giraffes.map((g) => g.name)).toContain("Aurora")
  })
})
```

## 用于非 GraphQL 入口

对于上规模的后端应用，往往有多个入口用于调用应用逻辑，除了 GraphQL 入口外，常见的有消息队列、gRPC、定时任务等。  

我们可以在其他入口中使用执行器来调用应用逻辑。  
下面是一个在定时任务中使用执行器调用应用逻辑的示例：

```ts
import { giraffeResolver } from "../resolvers/giraffe"
import { schedule } from "node-cron"

// Create an executor instance
const giraffeExecutor = giraffeResolver.toExecutor()

// Create a scheduled task that runs at 2 AM every day
schedule("0 2 * * *", async () => {
  try {
    // Get all giraffes
    const giraffes = await giraffeExecutor.giraffes()
    
    // Create a new record for each giraffe
    for (const giraffe of giraffes) {
      await giraffeExecutor.createGiraffe({
        name: `${giraffe.name} Jr.`,
        birthDate: new Date()
      })
    }
    
    console.log("Scheduled task completed successfully")
  } catch (error) {
    console.error("Scheduled task failed:", error)
  }
})
```