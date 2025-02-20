![GQLoom Logo](https://github.com/modevol-com/gqloom/blob/main/gqloom.svg?raw=true)

# GQLoom

[![License: MIT][license-image]][license-url]
[![CI][ci-image]][ci-url]
[![NPM version][npm-image]][npm-url]
[![Downloads][downloads-image]][npm-url]

English | [简体中文](./README.zh-CN.md)

GQLoom is a **Code First** GraphQL Schema Loom used to weave **runtime types** in the **TypeScript/JavaScript** ecosystem into a GraphQL Schema.

Runtime validation libraries such as [Zod](https://zod.dev/), [Valibot](https://valibot.dev/), and [Yup](https://github.com/jquense/yup) have been widely used in backend application development. Meanwhile, when using ORM libraries like [Prisma](https://www.prisma.io/), [MikroORM](https://mikro-orm.io/), and [Drizzle](https://orm.drizzle.team/), we also pre-define database table structures or entity models that contain runtime types.
The responsibility of GQLoom is to weave these runtime types into a GraphQL Schema.

When developing backend applications with GQLoom, you only need to write types using the Schema libraries you're familiar with. Modern Schema libraries will infer TypeScript types for you, and GQLoom will weave GraphQL types for you.
In addition, the **resolver factory** of GQLoom can create CRUD interfaces for `Prisma`, `MikroORM`, and `Drizzle`, and supports custom input and adding middleware.

## Hello World

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

## Highlights

- 🧑‍💻 **Development Experience**: Fewer boilerplate codes, semantic API design, and extensive ecosystem integration make development enjoyable.
- 🔒 **Type Safety**: Automatically infer types from the Schema, enjoy intelligent code completion during development, and detect potential problems during compilation.
- 🎯 **Interface Factory**: Ordinary CRUD interfaces are too simple yet too cumbersome. Let the resolver factory create them quickly.
- 🔋 **Fully Prepared**: Middleware, context, subscriptions, and federated graphs are ready.
- 🔮 **No Magic**: Without decorators, metadata, reflection, or code generation, it can run anywhere with just JavaScript/TypeScript.
- 🧩 **Rich Integration**: Use your most familiar validation libraries and ORMs to build your next GraphQL application.

## Getting Started

See [Getting Started](https://gqloom.dev/en/docs/getting-started) to learn how to use GQLoom.

## In this Repository

- [GQLoom Core](./packages/core/README.md): Core functions of the GraphQL loom;

- [GQLoom Drizzle](./packages/drizzle/README.md): Integration of GQLoom and Drizzle, capable of weaving database tables defined by Drizzle into a GraphQL Schema, and supports quickly creating CRUD interfaces from Drizzle using the resolver factory;

- [GQLoom Federation](./packages/federation/README.md): Provides GQLoom's support for Apollo Federation;

- [GQLoom Mikro ORM](./packages/mikro-orm/README.md): Integration of GQLoom and Mikro ORM, capable of weaving Mikro Entity into a GraphQL Schema, and supports quickly creating CRUD interfaces from Mikro ORM using the resolver factory;

- [GQLoom Prisma](./packages/prisma/README.md): Integration of GQLoom and Prisma, capable of weaving Prisma model into a GraphQL Schema, and supports quickly creating CRUD interfaces from Prisma using the resolver factory;

- [GQLoom Valibot](./packages/valibot/README.md): Integration of GQLoom and Valibot, capable of weaving Valibot Schema into a GraphQL Schema;

- [GQLoom Yup](./packages/yup/README.md): Integration of GQLoom and Yup, capable of weaving Yup Schema into a GraphQL Schema;

- [GQLoom Zod](./packages/zod/README.md): Integration of GQLoom and Zod, capable of weaving Zod Schema into a GraphQL Schema;

[license-image]: https://img.shields.io/badge/License-MIT-brightgreen.svg?style=flat-square
[license-url]: https://opensource.org/licenses/MIT
[ci-image]: https://img.shields.io/github/actions/workflow/status/modevol-com/gqloom/publish.yml?branch=main&logo=github&style=flat-square
[ci-url]: https://github.com/modevol-com/gqloom/actions/workflows/publish.yml
[npm-image]: https://img.shields.io/npm/v/%40gqloom%2Fcore.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/@gqloom/core
[downloads-image]: https://img.shields.io/npm/dm/%40gqloom%2Fcore.svg?style=flat-square