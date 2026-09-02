```yaml
example: interfaces-inheritance
model: composer-2.5
files_read:
  - /workspace/.local/eval/composer-2.5/PROTOCOL.md
  - /workspace/.local/type-graphql/examples/interfaces-inheritance/index.ts
  - /workspace/.local/type-graphql/examples/interfaces-inheritance/resolver.ts
  - /workspace/.local/type-graphql/examples/interfaces-inheritance/helpers.ts
  - /workspace/.local/type-graphql/examples/interfaces-inheritance/person/person.interface.ts
  - /workspace/.local/type-graphql/examples/interfaces-inheritance/person/person.type.ts
  - /workspace/.local/type-graphql/examples/interfaces-inheritance/person/person.input.ts
  - /workspace/.local/type-graphql/examples/interfaces-inheritance/student/student.type.ts
  - /workspace/.local/type-graphql/examples/interfaces-inheritance/student/student.input.ts
  - /workspace/.local/type-graphql/examples/interfaces-inheritance/employee/employee.type.ts
  - /workspace/.local/type-graphql/examples/interfaces-inheritance/employee/employee.input.ts
  - /workspace/.local/type-graphql/examples/interfaces-inheritance/resource/resource.interface.ts
  - /workspace/.local/type-graphql/examples/interfaces-inheritance/schema.graphql
  - /workspace/.local/type-graphql/examples/interfaces-inheritance/examples.graphql
  - /workspace/website/zh/docs/migrations/from-typegraphql.md
  - /workspace/website/zh/docs/schema/zod.md
  - /workspace/website/zh/docs/schema/parts/naming.info.md
  - /workspace/website/zh/docs/resolver.md
  - /workspace/website/zh/docs/weave.md
  - /workspace/website/zh/docs/silk.md
doc_sections_hit:
  - from-typegraphql 映射表（@InterfaceType → asObjectType({ interfaces })）
  - from-typegraphql 边界与停机条件（类继承需展平）
  - from-typegraphql orphanedTypes → weave 传入未引用 Silk
  - from-typegraphql DateTimeISO → ZodWeaver.config + GraphQLDateTimeISO
  - zod.md 声明接口（Fruit/Orange + asObjectType interfaces）
  - zod.md __typename 字面量命名
  - zod.md z.describe / z.meta 元数据
  - zod.md z.discriminatedUnion 联合类型（workaround）
  - resolver.md resolver.of + field().input() 计算字段
  - weave.md 编织单独丝线（orphaned Person）
outbound_links_followed:
  - /workspace/website/zh/docs/schema/zod.md（from-typegraphql 索引）
  - /workspace/website/zh/docs/resolver.md
  - /workspace/website/zh/docs/weave.md
  - /workspace/website/zh/docs/context.md（仅映射表提及，未使用）
  - /workspace/website/zh/docs/middleware.md（仅映射表提及，未使用）
searches:
  - pattern: interface|asObjectType|inheritance in website/zh/docs/schema/zod.md
  - pattern: interfaces|asObjectType in website/zh/docs/**
  - pattern: interface|orphan in website/zh/docs/resolver.md, weave.md
invented_apis: []
ignored_gotchas:
  - 迁移文写明类继承应展平，已用 personOutputFields 对象展开 + PersonInput.extend 代替 TS class extends
  - 名称/描述优先 z.describe / z.meta；仅 interfaces 关系使用 asObjectType
  - avatar 带参字段放在 resolver.of 而非 Silk（与迁移文计算字段一致）
stop_behavior: redesigned_to_context
recovery:
  - 尝试 query(z.array(IPerson)) 与 Student/Employee 的 asObjectType({ interfaces: [IPerson] }) 同 weave → 报 duplicate IPerson
  - 改为 z.discriminatedUnion + query(z.array(Persons))，保留 implements IPerson 与 mutation 返回具体类型
port_status: partial
sdl_notes: |
  可 weave。主要 SDL 差异：
  1. Query.persons 为 union `[Persons!]!`（Employee | Student），原 TypeGraphQL 为 interface 列表 `[IPerson!]!`。
  2. avatar(size) 出现在 Person/Student/Employee，未出现在 IPerson interface 字段列表（原 schema 在 interface 上声明 avatar）。
  3. id 编织为 String! 而非 ID!（文档仅将 cuid/uuid 等映射为 GraphQLID，未覆盖普通 string id）。
  4. 其余：IResource/IPerson 嵌套 interface、Person 孤儿类型、StudentInput/EmployeeInput、DateTimeISO 标量均对齐。
doc_gap: buried
fix_hint: "在 from-typegraphql 或 zod.md 增加「接口列表查询」完整示例：同一 weave 中 query 返回 interface 且 mutation 返回 implements 该 interface 的具体类型时，如何避免 IPerson 重复注册；或明确推荐 union + __typename 替代方案。"
```

## 过程

### TypeGraphQL 示例结构

原示例展示三层 GraphQL 接口与类继承：

- `IResource`（`@InterfaceType`）→ `IPerson`（`@InterfaceType`，`implements IResource`）
- `Person` / `Student` / `Employee`（`@ObjectType`，`Student`/`Employee` **extends** `Person`）
- `persons` 查询返回 `[IPerson!]!`，需运行时 `resolveType`（`constructor.name`）
- `avatar(size)` 为 interface 上的带参字段解析器
- `orphanedTypes: [Person]` 保证未在操作中引用的 `Person` 仍进入 schema

### 文档指引与映射

中文迁移文 `from-typegraphql.md` 给出清晰映射：

| TypeGraphQL | GQLoom |
|---|---|
| `@InterfaceType` | `asObjectType({ interfaces })` |
| 类继承 | 展平为组合（边界章节明确建议） |
| `orphanedTypes` | 将 Silk 直接传给 `weave` |
| 计算/带参字段 | `resolver.of` + `field().input()` |

`zod.md` 的 Fruit/Orange 示例说明：interface 丝线用 `__typename` 字面量 + `describe`；实现类型用 `asObjectType({ interfaces: [Fruit] })`。

### 继承展平（flatten）

文档在「边界与停机条件」写明复杂类继承需展平。移植中：

- **输出类型**：提取 `personOutputFields`，`Student`/`Employee` 直接展开公共字段，不再模拟 `extends Person`
- **输入类型**：`PersonInput` + `.extend()` 代替 `StudentInput extends PersonInput`
- **接口嵌套**：`IPerson.register(asObjectType, { interfaces: [IResource] })` 对应 TypeGraphQL 的 interface implements interface

未尝试保留 TypeGraphQL 的 `class extends` 语义——与文档建议一致，记为 **flatten**。

### 关键卡点：interface 列表查询

按映射表写出 `persons: query(z.array(IPerson))` 且 `Student`/`Employee` 使用 `asObjectType({ interfaces: [IPerson] })` 时，`weave` 报错：

```
Schema must contain uniquely named types but contains multiple types named "IPerson".
```

单独使用 query 或单独使用带 `interfaces` 的 mutation 均可成功；二者组合即失败。文档仅有 Orange 实现 Fruit 的静态示例，**没有**「查询返回 interface、变更返回 implements 类型」的编织说明。

**恢复策略（redesigned_to_context）**：采用 `zod.md` 已文档化的 `z.discriminatedUnion("__typename", [Student, Employee])` 作为 `persons` 返回类型。具体类型仍 `implements IPerson`，mutation 仍返回 `Student`/`Employee`，客户端可用 `__typename` + inline fragment（与原 `examples.graphql` 兼容，仅顶层列表类型从 interface 变为 union）。

### 其他实现细节

- **名称/描述**：`IPerson.describe(...)`、`id` 字段 `z.describe()`、input 用 `z.meta({ title: "StudentInput" })`；未默认使用 `asField`
- **avatar**：在 `resolver.of(Person|Student|Employee)` 中定义；因 interface 查询 workaround，avatar 未出现在 `interface IPerson` SDL 上
- **orphaned Person**：`weave(..., Person)` 对齐 `orphanedTypes`
- **DateTimeISO**：按迁移文配置 `ZodWeaver.config` + `GraphQLDateTimeISO`

## 结论

文档足够完成接口声明（含嵌套 `interfaces`）、类继承展平、孤儿类型与带参字段解析器的迁移，但 **interface 多态列表查询** 的编织模式缺失/埋藏，迫使将 `persons` 改为 union，属于 **partial** 移植。建议在迁移指南补充该场景的完整范例或已知限制说明。
