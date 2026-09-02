```yaml
example: authorization
model: composer-2.5
files_read:
  - /workspace/.local/eval/composer-2.5/PROTOCOL.md
  - /workspace/.local/type-graphql/examples/authorization/index.ts
  - /workspace/.local/type-graphql/examples/authorization/auth-checker.ts
  - /workspace/.local/type-graphql/examples/authorization/context.type.ts
  - /workspace/.local/type-graphql/examples/authorization/user.type.ts
  - /workspace/.local/type-graphql/examples/authorization/recipe.type.ts
  - /workspace/.local/type-graphql/examples/authorization/recipe.resolver.ts
  - /workspace/.local/type-graphql/examples/authorization/recipe.data.ts
  - /workspace/.local/type-graphql/examples/authorization/schema.graphql
  - /workspace/.local/type-graphql/examples/authorization/examples.graphql
  - /workspace/website/zh/docs/migrations/from-typegraphql.md
  - /workspace/website/zh/docs/middleware.md
  - /workspace/website/zh/docs/context.md
  - /workspace/website/zh/docs/resolver.md
  - /workspace/website/zh/docs/advanced/printing-schema.md
  - /workspace/website/zh/docs/schema/zod.md (部分：z.int、meta)
doc_sections_hit:
  - 迁移映射表 @Authorized + authChecker → 中间件
  - 迁移文「鉴权与上下文」authGuard + useContext 示例
  - 迁移文骨架 weave + asyncContextProvider
  - middleware.md 鉴权小节 authGuard、.use()、解析器/操作级中间件
  - context.md useContext、asyncContextProvider 启用方式
  - resolver.md resolver.of、query/mutation/field、field().resolve
  - printing-schema.md printSchema(lexicographicSortSchema(schema))
outbound_links_followed:
  - ../context.md
  - ../middleware.md
  - ../resolver.md
  - ../advanced/printing-schema.md
  - ../schema/zod.md
searches:
  - website/zh/docs 内 grep authGuard、.use(、field
invented_apis: []
ignored_gotchas:
  - asyncContextProvider：迁移文与 context 文均强调；已在 weave 中注入，未省略
  - useContext 必须先有 asyncContextProvider：已遵守
  - 字段级 @Authorized：原文在 Recipe.ingredients / Recipe.ratings 上；文档未单列说明，按 middleware 的 field 类型 + resolver.of field().use() 推断实现
  - TypeGraphQL 集中式 authChecker 注册：改为分散的 authGuard(...roles) 工厂 + 各操作/字段 .use()，与迁移文一致
  - 错误信息：迁移文示例用 "Not authenticated"/"Not authorized"；TypeGraphQL 示例 authChecker 返回 false 时默认 "Access denied!" — 为贴近原示例行为采用后者
  - deleteRecipe 中 findIndex===0 时返回 false 的疑似 bug：原样保留
stop_behavior: mechanical_translate
recovery: []
port_status: woven
sdl_notes: |
  成功 weave 并导出 SDL，与 TypeGraphQL schema.graphql 字段名、参数、可空性一致（无额外标量/枚举）。
  averageRating 为 resolver.of 计算字段；ingredients/ratings 在 Silk 与 field 解析器中均存在以保证 SDL 与运行时鉴权并存。
doc_gap: buried
fix_hint: "在 from-typegraphql.md「鉴权与上下文」补一小节：TypeGraphQL 类字段上的 @Authorized 需映射为 resolver.of 的 field().use(authGuard(...))，并说明 Silk 中保留字段以维持 SDL、field resolver 负责鉴权返回。"
```

## 过程

### 原示例要点

TypeGraphQL `authorization` 示例核心机制：

| 机制 | 原实现 |
| --- | --- |
| 全局鉴权 | `buildSchema({ authChecker })` |
| 角色检查 | `authChecker` 对比 `context.user.roles` 与 `@Authorized(...roles)` |
| 仅登录 | `@Authorized()` → `roles.length === 0` 时只校验 `user` 存在 |
| 操作级 | `addRecipe` 需登录；`deleteRecipe` 需 `ADMIN` |
| 字段级 | `ingredients` 需登录；`ratings` 需 `ADMIN`；`averageRating` 公开 |
| 上下文 | Apollo `context: () => ({ user })`；`authChecker` 读 `context.user`，无 `@Ctx` |
| TypeDI | 未使用 |

### 文档路径

1. **迁移总览**（`from-typegraphql.md`）给出映射：`@Authorized` + `authChecker` → 中间件 + `useContext()`；骨架要求 `weave(..., asyncContextProvider, ...)`。
2. **鉴权实现**直接采用迁移文内 `authGuard(...roles)` 工厂（ variadic roles、空数组表示仅认证），在中间件里 `useContext<Context>().user` 读用户。
3. **操作级** `.use(authGuard())` / `.use(authGuard("ADMIN"))` 对应 `addRecipe` / `deleteRecipe`。
4. **字段级** 文档未写「类属性 @Authorized」专节；结合 `middleware.md` 中 `type: field` 与 `resolver.md` 的 `field()`，对 `ingredients`、`ratings` 增加带 `.use(authGuard(...))` 的 field resolver，从 parent 返回数据。
5. **SDL** 按 `printing-schema.md` 用 `printSchema(lexicographicSortSchema(schema))` 写出 `sdl.graphql`。

### 未使用 / 未编造

- **asyncContextProvider**：已写入 `weave`，未省略。
- **authChecker API**：未发明；用文档中的 `authGuard` 中间件替代集中注册函数。
- **TypeDI / container**：未使用；模块级 `recipesData` 数组替代 resolver 类实例状态。
- **@Ctx**：原示例无此装饰器，未引入。

### 验收

- `weave` 成功，SDL 与 TypeGraphQL 生成文件一致。
- 运行时（`graphql()` + `contextValue.user`）：
  - 无用户查询 `ingredients` → `Access denied!`
  - `REGULAR` 用户可查 `ingredients`，查 `ratings` 拒绝
  - `ADMIN` 可查 `ratings`
  - 无用户可查 `averageRating`（公开计算字段）
  - `addRecipe` / `deleteRecipe` 角色约束符合预期

### 结论

迁移文档对**操作级** `@Authorized` 与 `authChecker` 的替代方案足够清晰（中间件 + `useContext` + `asyncContextProvider`）。**字段级** `@Authorized` 需读者自行将 middleware 的 `field` 类型与 `resolver.of` 的 `field().use()` 组合，属于「埋得较深」的缺口；补一段对照示例可降低误判为「在 resolve 里手写 if」的概率。整体可在不读源码、不猜包 API 的前提下完成编织与行为对齐。
