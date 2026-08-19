::: code-group
```sh [npm]
npm i graphql @gqloom/core yup @gqloom/yup
```
```sh [pnpm]
pnpm add graphql @gqloom/core yup @gqloom/yup
```
```sh [yarn]
yarn add graphql @gqloom/core yup @gqloom/yup
```
```sh [bun]
bun add graphql @gqloom/core yup @gqloom/yup
```
```sh [deno]
deno add npm:graphql npm:@gqloom/core npm:yup npm:@gqloom/yup
```
:::

Additionally, we need to declare GQLoom metadata for Yup in the project:

```ts [yup.d.ts]
import 'yup'
import { type GQLoomMetadata } from "@gqloom/yup"

declare module "yup" {
  export interface CustomSchemaMetadata extends GQLoomMetadata {}
}
```