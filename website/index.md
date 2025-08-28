---
layout: page
sidebar: false
---
<script setup>
import { Home } from '@/components/home.tsx'
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

<template v-slot:drizzle>

<!--@include: ./snippets/home/drizzle.md-->

</template>

<template v-slot:prisma>

<!--@include: ./snippets/home/prisma.md-->

</template>

<template v-slot:mikro>

<!--@include: ./snippets/home/mikro.md-->

</template>

</Home>