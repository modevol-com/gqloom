```yaml
example: middlewares-custom-decorators
model: composer-2.5
files_read:
  - /workspace/.local/eval/composer-2.5/PROTOCOL.md
  - /workspace/.local/type-graphql/examples/middlewares-custom-decorators/index.ts
  - /workspace/.local/type-graphql/examples/middlewares-custom-decorators/schema.graphql
  - /workspace/.local/type-graphql/examples/middlewares-custom-decorators/examples.graphql
  - /workspace/.local/type-graphql/examples/middlewares-custom-decorators/recipe/recipe.resolver.ts
  - /workspace/.local/type-graphql/examples/middlewares-custom-decorators/recipe/recipe.type.ts
  - /workspace/.local/type-graphql/examples/middlewares-custom-decorators/recipe/recipe.args.ts
  - /workspace/.local/type-graphql/examples/middlewares-custom-decorators/recipe/recipe.data.ts
  - /workspace/.local/type-graphql/examples/middlewares-custom-decorators/context.type.ts
  - /workspace/.local/type-graphql/examples/middlewares-custom-decorators/user.type.ts
  - /workspace/.local/type-graphql/examples/middlewares-custom-decorators/decorators/current-user.ts
  - /workspace/.local/type-graphql/examples/middlewares-custom-decorators/decorators/random-id-arg.ts
  - /workspace/.local/type-graphql/examples/middlewares-custom-decorators/decorators/validate-args.ts
  - /workspace/.local/type-graphql/examples/middlewares-custom-decorators/middlewares/error-logger.ts
  - /workspace/.local/type-graphql/examples/middlewares-custom-decorators/middlewares/log-access.ts
  - /workspace/.local/type-graphql/examples/middlewares-custom-decorators/middlewares/number-interceptor.ts
  - /workspace/.local/type-graphql/examples/middlewares-custom-decorators/middlewares/resolve-time.ts
  - /workspace/.local/type-graphql/examples/middlewares-custom-decorators/logger.ts
doc_sections_hit:
  - /workspace/website/zh/docs/migrations/from-typegraphql.md（@UseMiddleware → .use()/weave、createParameterDecorator → useContext/.input、asyncContextProvider）
  - /workspace/website/zh/docs/middleware.md（定义中间件、.use() 三级作用域、useResolverPayload、parseInput、logger 示例）
  - /workspace/website/zh/docs/context.md（useContext、asyncContextProvider、z.transform 访问上下文）
  - /workspace/website/zh/docs/resolver.md（resolver.of、field、query、.input）
  - /workspace/website/zh/docs/schema/zod.md（z.int、对象定义）
  - /workspace/website/zh/docs/advanced/printing-schema.md（printSchema）
outbound_links_followed: []
searches:
  - pattern: useResolverPayload|\.use\( in /workspace/website/docs
  - pattern: z\.int\(\)\.min|\.default\( in /workspace/website/zh/docs
  - pattern: field\(.*\)\.use\( in /workspace/website
invented_apis: []
ignored_gotchas:
  - 迁移文已说明 .default() 不会在 SDL 中生成 Int! = 0；本例 recipes(skip,take) 编织为可空 Int，与 TypeGraphQL 的 skip: Int! = 0 有差异，属文档已预告行为
  - ErrorLoggerMiddleware 原用 ArgumentValidationError；改为检测 GraphQLError.extensions.issues（middleware 输出校验示例中的结构），未在迁移文中明确说明
  - ResolveTimeMiddleware 原实现不 return next() 结果；GQLoom 洋葱模型需显式 return result（middleware 日志示例如此）
stop_behavior: mechanical_translate
recovery: []
port_status: woven
sdl_notes: |
  成功 weave 并导出 SDL。Recipe 类型字段与可空性与 TypeGraphQL schema.graphql 一致。
  差异：recipes 的 skip/take 在 GQLoom SDL 中为可空 Int（无 = 0 / = 10 默认值），与迁移文档「参数默认值与 SDL 表现」一致。
  recipe(id) 的 description 注释保留。
doc_gap: buried
fix_hint: "在 from-typegraphql.md 的 @UseMiddleware / createParameterDecorator 小节增加本示例的对照表：类级 @UseMiddleware → resolver.of(...).use()；字段级 → field().use()；globalMiddlewares → weave(..., mw)；CurrentUser → useContext；RandomIdArg → z.transform；ValidateArgs+class-validator → Zod .min/.max（无需单独中间件）。ErrorLogger 应说明 Zod 校验错误形态（extensions.issues）而非 ArgumentValidationError。"
```

# middlewares-custom-decorators 迁移评测报告

## 示例概览

TypeGraphQL 官方 `middlewares-custom-decorators` 示例演示：

- **中间件**：全局 `ErrorLoggerMiddleware`、解析器级 `ResolveTimeMiddleware`、字段级 `LogAccessMiddleware` 与 `NumberInterceptor`
- **自定义参数装饰器**：`@CurrentUser()`、`@RandomIdArg("id")`、`@ValidateArgs(RecipesArgs)`（配合 `@Args({ validate: false })` 与 class-validator）
- **IoC**：typedi 注入 `Logger` 与 `RecipeResolver`

## 文档阅读路径

以中文迁移文 `from-typegraphql.md` 为主，跟读 `middleware.md`、`context.md`、`resolver.md`、`schema/zod.md`。

核心映射在迁移文映射表与「边界与停机条件」中已给出：

| TypeGraphQL | 文档给出的 GQLoom 替代 |
| --- | --- |
| `@UseMiddleware` | `.use()` 或 `weave(..., middleware)` |
| `createParameterDecorator` | `useContext()` 或 `.input()` |
| `@Ctx` / 上下文 | `useContext()` + `asyncContextProvider` |
| `class-validator` | Zod 规则（输入默认校验） |

## 中间件迁移（@UseMiddleware → .use / weave）

| 原位置 | GQLoom 写法 |
| --- | --- |
| `globalMiddlewares: [ErrorLoggerMiddleware]` | `weave(ZodWeaver, asyncContextProvider, recipeResolver, errorLoggerMiddleware)` |
| `@UseMiddleware(ResolveTimeMiddleware)` 在 `RecipeResolver` 类上 | `resolver.of(Recipe, { ... }).use(resolveTimeMiddleware)` |
| `@UseMiddleware(LogAccessMiddleware)` 在 `Recipe.ratings` 字段 | `ratings: field(z.array(z.int())).use(logAccessMiddleware).resolve(...)` |
| `@UseMiddleware(NumberInterceptor(3))` 在 `averageRating` getter | `averageRating: field(z.number().nullish()).use(numberInterceptor(3)).resolve(...)` |

`middleware.md` 的 logger 示例与 `useResolverPayload().info` 直接对应 `ResolveTimeMiddleware`；鉴权/日志中间件中的 `useContext()` 模式对应 `LogAccessMiddleware` 与 `ErrorLoggerMiddleware`。

**字段级中间件**：迁移文只写「`.use()` 或 weave」，未举例 `field().use()`；`resolver.md` 的 `field()` 链式 API 与 `middleware.md` 的操作级 `.use()` 可类推，但需读者自行组合——记入 `doc_gap: buried`。

**typedi Logger**：迁移文写明「无内置 IoC，改 context 或模块级 provider」；本移植用模块级 `logger` 对象替代 `@Service()` 注入。

## 自定义参数装饰器处理

### `@CurrentUser()` → `useContext()`

原装饰器从 `context.currentUser` 取值。按 `context.md`，在 `recipes` 的 `resolve` 内调用 `useContext<Context>().currentUser`，并在 `weave` 中注入 `asyncContextProvider`。未发明任何 GQLoom 参数装饰器。

### `@RandomIdArg("id")` → `.input()` + Zod transform/refine

原装饰器在参数缺失时生成随机 id，并用 `validateFn` 限制范围。按 `context.md` Zod 小节「在验证输入时访问上下文」的 `z.transform` 模式，将逻辑写入 `recipe` 查询的 `id` 输入：

- `z.int().nullish().describe(...).transform(v => v ?? random).refine(0..MAX_ID_VALUE)`

GraphQL 参数仍为可空 `Int`，SDL 描述保留。

### `@ValidateArgs(RecipesArgs)` → Zod `.min()` / `.max()`（删除单独校验中间件）

原示例用方法中间件 + class-validator，且 `@Args({ validate: false })` 关闭内置校验。GQLoom 默认由 Zod 在进入 `resolve` 前校验；`recipes` 的 `.input({ skip: z.int().min(0).default(0), take: z.int().min(1).max(50).default(10) })` 等价替代 `RecipesArgs` 的 `@Min`/`@Max`，**无需**保留 `ValidateArgs` 中间件。

校验失败时错误为 Zod issue（`extensions.issues`），非 `ArgumentValidationError`；`errorLoggerMiddleware` 据此区分是否掩码错误，迁移文有关键陷阱说明但无 ErrorLogger 对照代码。

## 运行验证

在 `packages/zod` 工作区用 `tsx` 执行 `port.ts`：

- `weave` 成功，`port_status: woven`
- `recipes(skip:0,take:2)`：日志中间件与 `averageRating` 截断（<3 为 null）行为符合预期
- `recipes(take:-1)`：Zod 校验失败，被 `errorLoggerMiddleware` 记录后原样抛出

## SDL 对比

| 项 | TypeGraphQL | GQLoom |
| --- | --- | --- |
| `Recipe` 字段 | 一致 | 一致 |
| `recipe(id: Int)` | 可空，带描述 | 一致 |
| `recipes(skip, take)` | `Int! = 0`, `Int! = 10` | `Int`, `Int`（可空、无 SDL 默认值） |

后者与迁移文「参数默认值与 SDL 表现」一致，属已知差异而非 doc_gap。

## 结论

仅凭网站文档可完成本示例的机械迁移：`port.ts` 可 weave，SDL 除 `skip`/`take` 默认值表现外与原版一致。文档对 `@UseMiddleware` 与 `createParameterDecorator` 的**方向**足够，但字段级 `.use()`、ValidateArgs→Zod 删除中间件、ErrorLogger 错误类型迁移需读者从多页拼凑或推断——建议在对照表中增加本示例一行速查。
