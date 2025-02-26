---
layout: page
sidebar: false
---
<script setup>
import Home from '@/components/home.vue'
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

</Home>
