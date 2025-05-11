![GQLoom Logo](https://github.com/modevol-com/gqloom/blob/main/gqloom.svg?raw=true)

# GQLoom

GQLoom is a **Code-First** GraphQL Schema Loom used to weave **runtime types** in the **TypeScript/JavaScript** ecosystem into GraphQL Schema, helping you build GraphQL server enjoyably and efficiently.

Runtime validation libraries such as [Zod](https://zod.dev/), [Valibot](https://valibot.dev/), and [Yup](https://github.com/jquense/yup) have been widely used in backend application development. Meanwhile, when using ORM libraries like [Prisma](https://www.prisma.io/), [MikroORM](https://mikro-orm.io/), and [Drizzle](https://orm.drizzle.team/), we also pre-define database table structures or entity models that contain runtime types.
The responsibility of GQLoom is to weave these runtime types into a GraphQL Schema.

When developing backend applications with GQLoom, you only need to write types using the Schema libraries you're familiar with. Modern Schema libraries will infer TypeScript types for you, and GQLoom will weave GraphQL types for you.
In addition, the **resolver factory** of GQLoom can create CRUD interfaces for `Prisma`, `MikroORM`, and `Drizzle`, and supports custom input and adding middleware.

# @gqloom/federation

This package provides GQLoom support for [Apollo Federation](https://www.apollographql.com/docs/federation).

## Installation

```bash
# use npm
npm i graphql @gqloom/core @apollo/subgraph @gqloom/federation

# use pnpm
pnpm add graphql @gqloom/core @apollo/subgraph @gqloom/federation

# use yarn
yarn add graphql @gqloom/core @apollo/subgraph @gqloom/federation
```

Read more at [GQLoom Document](https://gqloom.dev/docs/advanced/federation).
