# Executor

Sometimes we want to invoke resolver methods directly instead of initiating a full GraphQL query. In such cases, we can use the `resolver().toExecutor()` method to create an executor.

## Basic Example

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

## Context Injection

Both contexts created via the `createContext` method and memoized contexts created via the `createMemoization` method can have different values injected when creating an executor.

```ts
const giraffeExecutor = giraffeResolver.toExecutor(
  asyncContextProvider.with(useCurrentUser.provide({ id: 9, roles: ["admin"] }))
)
```

## Unit Testing

Executors are well-suited for unit testing. Here's a simple unit test example:

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

## Non-GraphQL Entry Points

In large-scale backend applications, there are often multiple entry points to invoke application logic. Besides GraphQL, common ones include message queues, gRPC, and scheduled tasks.

We can use executors at these other entry points to invoke application logic.   
Here's an example of using an executor in a scheduled task:

```ts
import { giraffeResolver } from "../resolvers/giraffe"
import { schedule } from "node-cron"

// Create an executor instance
const giraffeExecutor = giraffeResolver.toExecutor()

// Schedule a task to run daily at 2 AM
schedule("0 2 * * *", async () => {
  try {
    // Fetch all giraffes
    const giraffes = await giraffeExecutor.giraffes()
    
    // Create a new entry for each giraffe
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