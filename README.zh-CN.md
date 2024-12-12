![GQLoom Logo](https://github.com/modevol-com/gqloom/blob/main/gqloom.svg?raw=true)

# GQLoom

[![License: MIT][license-image]][license-url]
[![NPM version][npm-image]][npm-url]
[![Downloads][downloads-image]][npm-url]

[English](./README.md) | 简体中文

GQLoom 是一个用于 TypeScript/JavaScript 的 GraphQL 编织器，使用 Valibot、Zod 或者 Yup 编织 GraphQL Schema 和 Resolvers, 支持完善的类型推断以提供最好的开发体验。

GQLoom 的设计受 [tRPC](https://trpc.io/)、[TypeGraphQL](https://typegraphql.com/)、[Pothos](https://pothos-graphql.dev/) 启发。

## 特性

* 🚀 GraphQL：灵活高效，减少冗余数据传输；
* 🔒 健壮的类型安全：在开发时享受智能提示，在编译时发现潜在问题；
* 🔋 整装待发：中间件、上下文、订阅、联邦图已经准备就绪；
* 🔮 没有额外魔法：没有装饰器、没有元数据和反射、没有代码生成，你只需要 JavaScript/TypeScript；
* 🧩 熟悉的模式库：使用你已熟识的模式库（Zod、Yup、Valibot）构建 GraphQL Schema 并验证输入；
* 🧑‍💻 愉快地开发：高可读性和语义化的 API 设计，使你的代码整洁；

## 你好 世界

```ts
import { resolver, query, ValibotWeaver } from "@gqloom/valibot"
import * as v from "valibot"

const helloResolver = resolver({
  hello: query(v.string(), () => "world"),
})

export const schema = ValibotWeaver.weave(helloResolver)
```

## 仓库导航

* [GQLoom Core](./packages/core/README.md): GraphQL 织布机核心功能；

* [GQLoom Federation](./packages/federation/README.md): 提供 GQLoom 对 Apollo Federation 的支持；

* [GQLoom Mikro ORM](./packages/mikro-orm/README.md): GQLoom 与 Mikro ORM 的集成；

* [GQLoom Prisma](./packages/prisma/README.md): GQLoom 与 Prisma 的集成；

* [GQLoom Valibot](./packages/valibot/README.md): GQLoom 与 Valibot 的集成；

* [GQLoom Yup](./packages/yup/README.md): GQLoom 与 Yup 的集成；

* [GQLoom Zod](./packages/zod/README.md): GQLoom 与 Zod 的集成；

[license-image]: https://img.shields.io/badge/License-MIT-brightgreen.svg?style=flat-square

[license-url]: https://opensource.org/licenses/MIT

[npm-image]: https://img.shields.io/npm/v/%40gqloom%2Fcore.svg?style=flat-square

[npm-url]: https://www.npmjs.com/package/@gqloom/core

[downloads-image]: https://img.shields.io/npm/dm/%40gqloom%2Fcore.svg?style=flat-square
