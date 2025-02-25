---
icon: BookMarked
---
# 介绍

## GraphQL 是什么

GraphQL 是一种用于 API 的查询语言，由 Facebook 开发并开源。它允许客户端指定所需的数据结构，从而减少不必要的数据传输，提高 API 的性能和可维护性。

GraphQL 带来了以下优点：

- **类型安全**：强类型查询语言，可以确保从服务端到客户端数据的一致性和安全性。
- **灵活聚合** 自动聚合多个查询，既减少客户端的请求次数，也保证服务端 API 的简洁性。
- **高效查询**：客户端可以指定所需的数据结构，从而减少不必要的数据传输，提高 API 的性能和可维护性。
- **易于扩展**：通过添加新的字段和类型来扩展 API，而不需要修改现有的代码。
- **高效协作**：使用 Schema 作为文档，减少沟通成本，提高开发效率。
- **繁荣生态**: 各类工具与框架不断推陈出新，社区活跃且发展迅速，应用领域广泛且未来前景广阔。

## GQLoom 是什么

GQLoom 是一个 **代码优先（Code-First）** 的 GraphQL Schema 纺织器，用于将 **TypeScript/JavaScript** 生态中的**运行时类型**编织成 GraphQL Schema。

[Zod](https://zod.dev/)、[Valibot](https://valibot.dev/)、[Yup](https://github.com/jquense/yup) 等运行时验证库已经在后端应用开发中得到广泛的使用；同时在使用 [Prisma](https://www.prisma.io/) 、[MikroORM](https://mikro-orm.io/)、[Drizzle](https://orm.drizzle.team/) 等 ORM 库时，我们也会预先定义包含运行时类型的数据库表结构或实体模型。
GQLoom 的职责就是将这些运行时类型编织为 GraphQL Schema。

当使用 GQLoom 开发后端应用时，你只需要使用你熟悉的 Schema 库编写类型，现代的 Schema 库将为你推导 TypeScript 类型，而 GQLoom 将为你编织 GraphQL 类型。  
除此之外，GQLoom 的**解析器工厂**还可以为 [Prisma]、[MikroORM]、[Drizzle] 生成 CRUD 接口，并支持自定义输入和添加中间件。

::: info
GQLoom 的设计受 [tRPC](https://trpc.io/)、[TypeGraphQL](https://typegraphql.com/)启发，在一些技术实现上参考了 [Pothos](https://pothos-graphql.dev/) 。
:::

### 你好，世界

::: code-group
```ts twoslash [valibot]
import { resolver, query, weave } from "@gqloom/core"
import { ValibotWeaver } from "@gqloom/valibot"
import * as v from "valibot"

const helloResolver = resolver({
  hello: query(v.string())
    .input({ name: v.nullish(v.string(), "World") })
    .resolve(({ name }) => `Hello, ${name}!`),
})

export const schema = weave(ValibotWeaver, helloResolver)
```

```ts twoslash [zod]
import { resolver, query, weave } from "@gqloom/core"
import { ZodWeaver } from "@gqloom/zod"
import { z } from "zod"

const helloResolver = resolver({
  hello: query(z.string())
    .input({ name: z.string().nullish() })
    .resolve(({ name }) => `Hello, ${name ?? "World"}!`),
})

export const schema = weave(ZodWeaver, helloResolver)
```
:::

### 亮点咫尺可及

- 🧑‍💻 **开发体验**：更少的样板代码、语义化的 API 设计、广泛的生态集成使开发愉快；
- 🔒 **类型安全**：从 Schema 自动推导类型，在开发时享受智能提示，在编译时发现潜在问题；
- 🎯 **接口工厂**：寻常的 CRUD 接口太简单又太繁琐了，交给解析器工厂来快速创建；
- 🔋 **整装待发**：中间件、上下文、订阅、联邦图已经准备就绪；
- 🔮 **抛却魔法**：没有装饰器、没有元数据和反射、没有代码生成，只需要 JavaScript/TypeScript 就可以在任何地方运行；
- 🧩 **丰富集成**：使用你最熟悉的验证库和 ORM 来建构你的下一个 GraphQL 应用；