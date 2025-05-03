# Changelog

All notable changes to this project will be documented in this file.

## next (YYYY-MM-DD)

- Feat: Updated resolver functions to accept a `payload` parameter

## 0.8.4 (2025-04-08)

- Feat: add `screamingSnakeCase` to convert strings to screaming snake case

## 0.8.3 (2025-03-31)

- Fix: ensure context work in subscription

## 0.8.2 (2025-03-26)

- Fix: improve type inference for `subscription`

## 0.8.1 (2025-03-23)

- Feat: export Resolver types

## 0.8.0 (2025-03-11)

- Feat: `field.load()` to easier load data using data loader
- Feat: chaining resolver factory
- Feat: enhance type inference for `silk`
- **Break change** refactor: rename `MiddlewareOptions.type` to `MiddlewareOptions.operation`
- **Break change** refactor: remove `createLoom` in `@gqloom/core`

## 0.7.2 (2025-02-16)

- Fix: update document link in README

## 0.7.1 (2025-02-16)

- Fix: `query().resolve()` return type
- Fix: update CallableInputParser interface documentation

## 0.7.0 (2025-01-25)

- Fix: `silk.list` to correctly handle non-nullable list types
- Refactor: move `EasyDataLoader` to `@gqloom/core`

## 0.6.0 (2024-12-13)

- Feature: auto assign names to objects and inputs
- Refactor: rename `SchemaWeaver` to `GraphQLSchemaLoom`

## 0.5.0 (2024-12-03)

- Fix: add all objects in `resolver.of` to `context.types`
- Chore: update `@standard-schema/spec` to 1.0.0-beta.4
- Refactor: update `CallableMiddlewareOptions` for middleware

## 0.4.0 (2024-11-12)

- Refactor: follow standard-schema ([#7](https://github.com/modevol-com/gqloom/pull/7))

## 0.3.0 (2024-10-19)
