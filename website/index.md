---
layout: page
sidebar: false
---
<script setup>
import { Home, ormTab } from '@/components/home.tsx'
</script>

<Home>

<template v-slot:schemaLibraries>

::: code-group
<<< @/snippets/home/valibot.ts{ts twoslash} [valibot]
<<< @/snippets/home/zod.ts{ts twoslash} [zod]
<<< @/snippets/home/yup.ts{ts twoslash} [yup]
:::

</template>

<template v-slot:schemaGraphQl>

```GraphQL
type Giraffe {
  """The giraffe's name"""
  name: String!
  birthday: String!
  age(currentDate: String): Int!
}
```

</template>

<template v-slot:orm>

<template v-if="ormTab === 'Drizzle'">

<!--@include: ./snippets/home/drizzle.md-->

</template>

<template v-else-if="ormTab === 'Prisma'">

<!--@include: ./snippets/home/prisma.md-->

</template>

<template v-else-if="ormTab === 'MikroORM'">

<!--@include: ./snippets/home/mikro.md-->

</template>

</template>

</Home>