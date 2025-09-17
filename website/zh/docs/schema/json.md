<script setup lang="ts">
import { Tabs } from '@/components/tabs'
</script>

# JSON Schema

[JSON Schema](https://json-schema.org/) 是一种声明性语言，用于标注和验证 JSON 文档的结构、约束条件及数据类型。它可帮助你实现 JSON 数据的标准化，并明确对 JSON 数据的预期要求。

## 安装

我们可以在项目中直接使用 JSON Schema，也可以使用 [typebox](https://sinclairzx81.github.io/typebox/) 帮助我们构建 JSON Schema。


<Tabs groupId="json-schema-builder">
<template #JSON_Schema>

::: code-group
```sh [npm]
npm i @gqloom/core @gqloom/json
```
```sh [pnpm]
pnpm add @gqloom/core @gqloom/json
```
```sh [yarn]
yarn add @gqloom/core @gqloom/json
```
```sh [bun]
bun add @gqloom/core @gqloom/json
```
:::

</template>
<template #TypeBox>

::: code-group
```sh [npm]
npm i @gqloom/core typebox @gqloom/json
```
```sh [pnpm]
pnpm add @gqloom/core typebox @gqloom/json
```
```sh [yarn]
yarn add @gqloom/core typebox @gqloom/json
```
```sh [bun]
bun add @gqloom/core typebox @gqloom/json
```
:::

</template>
</Tabs>

## 定义简单标量

<Tabs groupId="json-schema-builder">
<template #JSON_Schema>

</template>
<template #TypeBox>

</template>
</Tabs>

## 编织

## 定义对象

## 定义联合类型

## 定义枚举类型

## 自定义类型映射

## 默认类型映射
