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

另外，我们还需要在项目中为 Yup 声明来自 GQLoom 的元数据：

```ts [yup.d.ts]
import 'yup'
import { type GQLoomMetadata } from "@gqloom/yup"

declare module "yup" {
  export interface CustomSchemaMetadata extends GQLoomMetadata {}
}
```