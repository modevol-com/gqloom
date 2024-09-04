# GQLoom

[English](./README.md) | 简体中文

GQLoom 是一个用于 TypeScript/JavaScript 的 GraphQL 编织器，使用 Zod、Yup 或者 Valibot 来愉快地编织 GraphQL Schema, 支持完善的类型推断以提供最好的开发体验。

# GQLoom Mikro ORM

Mikro ORM 是一个出色的 TypeScript ORM，支持多种数据库，如 MySQL、PostgreSQL、SQLite 等。
`@gqloom/mikro-orm` 提供了 GQLoom 与 [MikroORM](https://mikro-orm.io/) 的集成，包含以下功能：

- 使用 MikroORM 的 Entity Schema 作为丝线；
- 将丝线编织成 MikroORM 的 Entity Schema；
- 为 MikroORM 的 Entity Schema 生成 Repository 映射 GraphQL 解析器。
