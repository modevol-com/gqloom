![GQLoom Logo](https://github.com/modevol-com/gqloom/blob/main/gqloom.svg?raw=true)

# GQLoom

[![License: MIT][license-image]][license-url]
[![NPM version][npm-image]][npm-url]
[![Downloads][downloads-image]][npm-url]

English | [简体中文](./README.zh-CN.md)

GQLoom is a GraphQL weaver for TypeScript/JavaScript that weaves GraphQL Schema and Resolvers using Valibot, Zod, or Yup, and supports sophisticated type inference to provide the best development experience.

The design of GQLoom is inspired by [tRPC](https://trpc.io/), [TypeGraphQL](https://typegraphql.com/), [Pothos](https://pothos-graphql.dev/).

## Features

- 🚀 GraphQL: flexible and efficient, reducing redundant data transfers;
- 🔒 Robust type safety: enjoy intelligent hints at development time to detect potential problems at compile time;
- 🔋 Ready to go: middleware, contexts, subscriptions, federated graphs are ready to go;
- 🔮 No extra magic: no decorators, no metadata and reflection, no code generation, you just need JavaScript/TypeScript;
- 🧩 Familiar schema libraries: use the schema libraries you already know (Zod, Yup, Valibot) to build GraphQL Schema and validate inputs;
- 🧑‍💻 Develop happily: highly readable and semantic APIs designed to keep your code tidy;

## Hello World

```ts
import { resolver, query, weave } from "@gqloom/valibot"
import * as v from "valibot"

const HelloResolver = resolver({
  hello: query(v.string(), () => "world"),
})

export const schema = weave(HelloResolver)
```

Read [Introduction](https://gqloom.dev/guide/introduction.html) to learn more about GQLoom.

## Getting Started

See [Getting Started](https://gqloom.dev/guide/getting-started.html) to learn how to use GQLoom.

## In this Repository

- [GQLoom Core](./packages/core/README.md): GraphQL Loom Core Features;

- [GQLoom Federation](./packages/federation/README.md): Provides GQLoom support for Apollo Federation;

- [GQLoom Mikro ORM](./packages/mikro-orm/README.md): GQLoom integration with Mikro ORM;

- [GQLoom Valibot](./packages/valibot/README.md): GQLoom integration with Valibot;

- [GQLoom Yup](./packages/yup/README.md): GQLoom integration with Yup;

- [GQLoom Zod](./packages/zod/README.md): GQLoom integration with Zod;

[license-image]: https://img.shields.io/badge/License-MIT-brightgreen.svg?style=flat-square
[license-url]: https://opensource.org/licenses/MIT
[npm-image]: https://img.shields.io/npm/v/%40gqloom%2Fcore.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/@gqloom/core
[downloads-image]: https://img.shields.io/npm/dm/%40gqloom%2Fcore.svg?style=flat-square
