---
title: Elysia
---

[Elysia](https://elysiajs.com/) 是一个符合人体工程学的 Web 框架，用于使用 Bun 构建后端服务器。

Elysia 在设计时考虑到了简洁性和类型安全性，它拥有大家熟悉的 API，对 TypeScript 提供了广泛支持，并且针对 Bun 进行了优化。

## 安装

```package-install
elysia @elysiajs/graphql-yoga graphql @gqloom/core
```

## 使用方法

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
  `🦊 Elysia 正在 ${app.server?.hostname}:${app.server?.port} 运行`
)
```

## 上下文

当将 GQLoom 与 `@elysiajs/graphql-yoga` 一起使用时，你可以使用 `YogaInitialContext` 来标注上下文的类型：

```ts
import { useContext } from '@gqloom/core'
import type { YogaInitialContext } from 'graphql-yoga'

export function useAuthorization() {
  return useContext<YogaInitialContext>().request.headers.get('Authorization')
}
```

你也可以在 [Elysia 文档](https://elysiajs.com/plugins/graphql-yoga.html) 中了解更多关于上下文的信息。