![GQLoom Logo](https://github.com/modevol-com/gqloom/blob/main/gqloom.svg?raw=true)

# GQLoom

[![License: MIT][license-image]][license-url]
[![CI][ci-image]][ci-url]
[![NPM version][npm-image]][npm-url]
[![Downloads][downloads-image]][npm-url]

[English](./README.md) | 简体中文

GQLoom 是一个 **代码优先（Code-First）** 的 GraphQL Schema 纺织器，用于将 **TypeScript/JavaScript** 生态中的**运行时类型**编织成 GraphQL Schema，帮助你愉快且高效地建构 GraphQL 服务。

[Zod](https://zod.dev/)、[Valibot](https://valibot.dev/)、[Yup](https://github.com/jquense/yup) 等运行时验证库已经在后端应用开发中得到广泛的使用；同时在使用 [Prisma](https://www.prisma.io/) 、[MikroORM](https://mikro-orm.io/)、[Drizzle](https://orm.drizzle.team/) 等 ORM 库时，我们也会预先定义包含运行时类型的数据库表结构或实体模型。
GQLoom 的职责就是将这些运行时类型编织为 GraphQL Schema。

当使用 GQLoom 开发后端应用时，你只需要使用你熟悉的 Schema 库编写类型，现代的 Schema 库将为你推导 TypeScript 类型，而 GQLoom 将为你编织 GraphQL 类型。  
除此之外，GQLoom 的**解析器工厂**还可以为 `Prisma`、`MikroORM`、`Drizzle` 生成 CRUD 接口，并支持自定义输入和添加中间件。

## 你好 世界

```ts
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

## 亮点

- 🧑‍💻 **开发体验**：更少的样板代码、语义化的 API 设计、广泛的生态集成使开发愉快；
- 🔒 **类型安全**：从 Schema 自动推导类型，在开发时享受智能提示，在编译时发现潜在问题；
- 🎯 **接口工厂**：寻常的 CRUD 接口简单又繁琐，交给解析器工厂来快速创建；
- 🔋 **整装待发**：中间件、上下文、订阅、联邦图已经准备就绪；
- 🔮 **抛却魔法**：没有装饰器、没有元数据和反射、没有代码生成，只需要 JavaScript/TypeScript 就可以在任何地方运行；
- 🧩 **丰富集成**：使用你最熟悉的验证库和 ORM 来建构你的下一个 GraphQL 应用；

## 入门

请参阅[入门](https://gqloom.dev/zh/docs/getting-started)，了解如何使用GQLoom。

## 仓库导航

| 包                                                   | 描述                                                                                                                             |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| [GQLoom Core](./packages/core/README.md)             | GraphQL 织布机核心功能                                                                                                           |
| [GQLoom Drizzle](./packages/drizzle/README.md)       | GQLoom 与 Drizzle 的集成，能够将用 Drizzle定义的数据库表格编织为 GraphQL Schema，支持使用解析器工厂从 Drizzle 快速创建 CRUD 接口 |
| [GQLoom Federation](./packages/federation/README.md) | 提供 GQLoom 对 Apollo Federation 的支持                                                                                          |
| [GQLoom Mikro ORM](./packages/mikro-orm/README.md)   | GQLoom 与 Mikro ORM 的集成，能够将 Mikro Entity 编织为 GraphQL Schema，支持使用解析器工厂从 Mikro ORM 快速创建 CRUD 接口         |
| [GQLoom Prisma](./packages/prisma/README.md)         | GQLoom 与 Prisma 的集成，能够将 Prisma model 编织为 GraphQL Schema，支持使用解析器工厂从 Prisma 快速创建 CRUD 接口               |
| [GQLoom Valibot](./packages/valibot/README.md)       | GQLoom 与 Valibot 的集成，能够将 Valibot Schema 编织为 GraphQL Schema                                                            |
| [GQLoom Yup](./packages/yup/README.md)               | GQLoom 与 Yup 的集成，能够将 Yup Schema 编织为 GraphQL Schema                                                                    |
| [GQLoom Zod](./packages/zod/README.md)               | GQLoom 与 Zod 的集成，能够将 Zod Schema 编织为 GraphQL Schema                                                                    |

[license-image]: https://img.shields.io/badge/License-MIT-brightgreen.svg?style=flat-square
[license-url]: https://opensource.org/licenses/MIT
[ci-image]: https://img.shields.io/github/actions/workflow/status/modevol-com/gqloom/publish.yml?branch=main&logo=github&style=flat-square
[ci-url]: https://github.com/modevol-com/gqloom/actions/workflows/publish.yml
[npm-image]: https://img.shields.io/npm/v/%40gqloom%2Fcore.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/@gqloom/core
[downloads-image]: https://img.shields.io/npm/dm/%40gqloom%2Fcore.svg?style=flat-square