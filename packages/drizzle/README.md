![GQLoom Logo](https://github.com/modevol-com/gqloom/blob/main/gqloom.svg?raw=true)

# GQLoom

GQLoom is a **Code First** GraphQL Schema Loom used to weave **runtime types** in the **TypeScript/JavaScript** ecosystem into a GraphQL Schema.

Runtime validation libraries such as [Zod](https://zod.dev/), [Valibot](https://valibot.dev/), and [Yup](https://github.com/jquense/yup) have been widely used in backend application development. Meanwhile, when using ORM libraries like [Prisma](https://www.prisma.io/), [MikroORM](https://mikro-orm.io/), and [Drizzle](https://orm.drizzle.team/), we also pre-define database table structures or entity models that contain runtime types.
The responsibility of GQLoom is to weave these runtime types into a GraphQL Schema.

When developing backend applications with GQLoom, you only need to write types using the Schema libraries you're familiar with. Modern Schema libraries will infer TypeScript types for you, and GQLoom will weave GraphQL types for you.
In addition, the **resolver factory** of GQLoom can create CRUD interfaces for `Prisma`, `MikroORM`, and `Drizzle`, and supports custom input and adding middleware.

## Drizzle

[Drizzle](https://orm.drizzle.team/) is a modern, type-safe TypeScript ORM designed for Node.js. It offers a concise and easy-to-use API, supports databases such as PostgreSQL, MySQL, and SQLite, and has powerful query builders, transaction processing, and database migration capabilities. At the same time, it remains lightweight and has no external dependencies, making it very suitable for database operation scenarios that require high performance and type safety.

## @gqloom/drizzle

This package provides GQLoom integration with [Drizzle](https://orm.drizzle.team/):

- Weave database tables defined by Drizzle into a GraphQL Schema;
- Support quickly creating CRUD interfaces from Drizzle using the resolver factory;

Read more at [GQLoom Document](https://gqloom.dev/docs/schema/drizzle).
