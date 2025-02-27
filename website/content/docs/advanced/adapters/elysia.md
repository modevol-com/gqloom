---
title: Elysia
---

[Elysia](https://elysiajs.com/) is an ergonomic web framework for building backend servers with Bun.

Designed with simplicity and type-safety in mind, Elysia has a familiar API with extensive support for TypeScript, optimized for Bun.

## Installation

```package-install
elysia @elysiajs/graphql-yoga graphql @gqloom/core
```

## Usage

```ts
import { Elysia } from 'elysia'
import { query, resolver, weave } from '@gqloom/core'
import { yoga } from '@elysiajs/graphql-yoga'
import { z } from 'zod'
import { ZodWeaver } from '@gqloom/zod'
import { helloResolver } from "./resolvers"

const schema = weave(helloResolver)

const app = new Elysia().use(yoga({ schema })).listen(8001)

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
)
```

## Contexts

When using GQLoom together with `@elysiajs/graphql-yoga`, you can use `YogaInitialContext` to label the type of context:

```ts
import { useContext } from '@gqloom/core'
import type { YogaInitialContext } from 'graphql-yoga'

export function useAuthorization() {
  return useContext<YogaInitialContext>().request.headers.get('Authorization')
}
```

You can also learn more about contexts in the [Elysia documentation](https://elysiajs.com/plugins/graphql-yoga.html).