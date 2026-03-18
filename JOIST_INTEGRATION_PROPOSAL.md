# Joist ORM 集成方案

## 概述

这是一份关于将 Joist ORM 集成到 GQLoom 的详细提案。Joist 是一个对 GraphQL 非常友好的 TypeScript ORM,与 GQLoom 的设计理念高度契合。

## Joist ORM 特性分析

### 核心优势

1. **代码生成驱动** - 从数据库架构自动生成类型安全的领域模型
2. **内置 N+1 防护** - 通过 DataLoader 集成实现批量加载和预加载
3. **类型安全** - 在编译时跟踪关系的加载状态
4. **GraphQL 友好** - 提供 `findGql` 方法和 GraphQL 过滤器支持
5. **响应式字段** - 支持声明式计算字段,依赖变化时自动更新
6. **PostgreSQL 优化** - 所有查询针对 PostgreSQL 优化,支持批量操作

### 与 GQLoom 的契合点

- **类型推断**: Joist 生成的实体类包含完整的 TypeScript 类型信息,可以直接被 GQLoom 编织
- **GraphQL 优化**: Joist 的 `findGql` 和 GraphQL 过滤器与 GQLoom 的 resolver factory 完美配合
- **DataLoader**: Joist 内置的 DataLoader 支持可以无缝集成到 GQLoom 的字段解析器中

## 集成架构设计

### 1. 包结构

```
packages/joist/
├── src/
│   ├── index.ts              # 主入口,导出 JoistWeaver 和工具函数
│   ├── types.ts              # TypeScript 类型定义
│   ├── weaver.ts             # JoistWeaver 类 - 将 Joist 实体编织成 GraphQL Schema
│   ├── factory/
│   │   ├── index.ts          # 导出所有 factory
│   │   ├── resolver.ts       # JoistResolverFactory - 创建 CRUD resolvers
│   │   ├── input.ts          # JoistInputFactory - 创建 GraphQL input types
│   │   └── types.ts          # Factory 相关类型定义
│   ├── helper.ts             # 辅助函数
│   └── utils.ts              # 工具函数
├── test/
│   ├── schema.spec.ts        # Schema 编织测试
│   ├── resolver.spec.ts      # Resolver factory 测试
│   └── input.spec.ts         # Input factory 测试
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

### 2. 核心组件设计

#### 2.1 JoistWeaver (类似 MikroWeaver/PrismaWeaver)

```typescript
export class JoistWeaver {
  public static vendor = "gqloom.joist"

  /**
   * 将 Joist 实体类转换为 GraphQL Silk
   * @param entityClass Joist 实体类 (如 Author, Book)
   * @param config 可选配置
   */
  public static unravel<TEntity extends Entity>(
    entityClass: EntityConstructor<TEntity>,
    config?: JoistSilkConfig<TEntity>
  ): JoistEntitySilk<TEntity> {
    // 实现类似 MikroWeaver.unravel 的逻辑
    // 返回包含 StandardSchemaV1 和 GraphQL 类型生成函数的 Silk
  }

  /**
   * 获取实体的 GraphQL 类型
   * @param entityClass Joist 实体类
   * @param metadata 实体元数据
   */
  public static getGraphQLType(
    entityClass: EntityConstructor<any>,
    metadata: EntityMetadata,
    options?: {
      required?: string[] | boolean
      partial?: string[] | boolean
      pick?: string[]
      name?: string
    }
  ): GraphQLObjectType {
    // 从 Joist 实体元数据生成 GraphQL ObjectType
    // 处理字段类型映射、关系字段等
  }

  /**
   * 获取字段的 GraphQL 类型
   * @param field Joist 字段元数据
   */
  protected static getFieldType(
    field: FieldMetadata,
    entity: EntityMetadata
  ): GraphQLOutputType | undefined {
    // 映射 Joist 字段类型到 GraphQL 类型
    // 支持原始类型、枚举、关系等
  }

  /**
   * 创建 Joist weaver 配置
   */
  public static config = function(
    config: JoistWeaverConfigOptions
  ): JoistWeaverConfig {
    return {
      ...config,
      [SYMBOLS.WEAVER_CONFIG]: "gqloom.joist",
    }
  }
}
```

#### 2.2 JoistResolverFactory (类似 MikroResolverFactory)

```typescript
export class JoistResolverFactory<TEntity extends Entity> {
  constructor(
    protected readonly entityClass: EntityConstructor<TEntity>,
    protected readonly getEntityManager: (payload: ResolverPayload) => Promise<EntityManager>
  ) {}

  /**
   * 查询操作
   */
  public findQuery(): JoistFindQuery<TEntity> {
    // 使用 em.find() 实现
    // 支持 where, orderBy, limit, offset
    // 利用 Joist 的字段选择优化
  }

  public findGqlQuery(): JoistFindGqlQuery<TEntity> {
    // 使用 em.findGql() 实现
    // 支持 GraphQL 过滤器
    // 这是 Joist 独有的优势
  }

  public findOneQuery(): JoistFindOneQuery<TEntity> {
    // 使用 em.findOne() 实现
  }

  public findOneOrFailQuery(): JoistFindOneOrFailQuery<TEntity> {
    // 使用 em.findOneOrFail() 实现
  }

  public countQuery(): JoistCountQuery<TEntity> {
    // 使用 em.find().then(r => r.length) 或类似方法
  }

  /**
   * 变更操作
   */
  public createMutation(): JoistCreateMutation<TEntity> {
    // 创建新实体
    // 使用 em.create() + em.flush()
  }

  public updateMutation(): JoistUpdateMutation<TEntity> {
    // 更新实体
    // 使用 em.load() + 属性设置 + em.flush()
  }

  public deleteMutation(): JoistDeleteMutation<TEntity> {
    // 删除实体
    // 使用 em.delete() + em.flush()
  }

  /**
   * 关系字段
   */
  public referenceField<TKey extends ReferenceKeys<TEntity>>(
    key: TKey
  ): JoistReferenceField<TEntity, TKey> {
    // 处理 ManyToOne / OneToOne 关系
    // 利用 Joist 的 Reference.load({ dataloader: true })
  }

  public collectionField<TKey extends CollectionKeys<TEntity>>(
    key: TKey
  ): JoistCollectionField<TEntity, TKey> {
    // 处理 OneToMany / ManyToMany 关系
    // 利用 Joist 的 Collection.load({ dataloader: true })
  }

  /**
   * 完整 resolver
   */
  public resolver(name?: string): JoistResolver<TEntity> {
    // 返回包含所有 CRUD 操作和关系字段的 resolver
  }

  public queriesResolver(name?: string): JoistQueriesResolver<TEntity> {
    // 仅包含查询操作的 resolver
  }
}
```

#### 2.3 JoistInputFactory (类似 MikroInputFactory)

```typescript
export class JoistInputFactory<TEntity extends Entity> {
  constructor(protected readonly entityClass: EntityConstructor<TEntity>) {}

  /**
   * 创建 where 条件输入类型
   */
  public whereInputSilk(): GraphQLSilk<WhereClause<TEntity>> {
    // 生成 GraphQL Input 类型用于 where 条件
    // 支持各种过滤操作: eq, ne, gt, lt, in, like 等
  }

  /**
   * 创建 GraphQL 过滤器输入类型 (Joist 特有)
   */
  public gqlFilterInputSilk(): GraphQLSilk<GraphQLFilterOf<TEntity>> {
    // 生成与 Joist 的 findGql 兼容的过滤器
    // 这是 Joist 的独特优势
  }

  /**
   * 创建排序输入类型
   */
  public orderByInputSilk(): GraphQLSilk<OrderBy<TEntity>> {
    // 生成排序输入类型
  }

  /**
   * 创建数据输入类型
   */
  public createInputSilk(): GraphQLSilk<CreateInput<TEntity>> {
    // 用于 create 操作的输入类型
  }

  public updateInputSilk(): GraphQLSilk<UpdateInput<TEntity>> {
    // 用于 update 操作的输入类型
  }
}
```

### 3. 类型映射策略

#### Joist 到 GraphQL 的类型映射

| Joist 类型        | GraphQL 类型      | 说明                          |
|-------------------|-------------------|-------------------------------|
| `string`          | `GraphQLString`   | 标准字符串                    |
| `number`          | `GraphQLInt`      | 整数                          |
| `bigint`          | `GraphQLString`   | BigInt 序列化为字符串         |
| `boolean`         | `GraphQLBoolean`  | 布尔值                        |
| `Date`            | `GraphQLString`   | ISO 8601 格式                 |
| `enum`            | `GraphQLEnumType` | 枚举类型                      |
| `ManyToOne`       | 关联实体类型      | 引用字段                      |
| `OneToMany`       | `[关联实体类型]`  | 集合字段                      |
| `OneToOne`        | 关联实体类型      | 一对一关系                    |
| Primary Key       | `GraphQLID`       | 主键字段                      |

### 4. Joist 特有功能集成

#### 4.1 GraphQL 过滤器

Joist 提供的 `AuthorGraphQLFilter` 类型可以直接用于 GraphQL 查询:

```typescript
// Joist 代码示例
const authors = await em.findGql(Author, {
  filter: {
    firstName: { eq: "John" },
    books: { some: { title: { contains: "GraphQL" } } }
  }
});

// GQLoom 集成后的 GraphQL 查询
query {
  findGqlAuthor(
    filter: {
      firstName: { eq: "John" }
      books: { some: { title: { contains: "GraphQL" } } }
    }
  ) {
    id
    firstName
    books {
      title
    }
  }
}
```

#### 4.2 DataLoader 优化

Joist 内置 DataLoader 支持,可以直接在关系字段中使用:

```typescript
public referenceField<TKey extends ReferenceKeys<TEntity>>(
  key: TKey
): JoistReferenceField<TEntity, TKey> {
  return new FieldFactoryWithResolve(/* ... */, {
    resolve: async (parent, _args, payload) => {
      // Joist 的 Reference 会自动使用 DataLoader
      const reference = parent[key] as Reference<any>
      return reference.load() // 自动批量加载
    }
  })
}
```

#### 4.3 响应式字段

Joist 的响应式字段可以作为计算字段暴露到 GraphQL:

```typescript
// Joist 实体定义
class Author extends AuthorCodegen {
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`
  }
}

// 在 GQLoom 中作为 GraphQL 字段暴露
const AuthorSilk = joistSilk(Author, {
  fields: {
    fullName: v.string() // 使用 Valibot 定义类型
  }
})
```

## 实现优先级

### Phase 1: 核心功能 (MVP)
- [x] 项目结构设计
- [ ] `JoistWeaver` 基础实现
  - [ ] `unravel()` - 实体到 Silk 转换
  - [ ] `getGraphQLType()` - GraphQL 类型生成
  - [ ] 基本字段类型映射
- [ ] `JoistResolverFactory` 基础查询
  - [ ] `findQuery()`
  - [ ] `findOneQuery()`
  - [ ] `countQuery()`
- [ ] `JoistInputFactory` 基础输入类型
  - [ ] `whereInputSilk()`
  - [ ] `createInputSilk()`
- [ ] 基础测试和文档

### Phase 2: CRUD 完整支持
- [ ] `JoistResolverFactory` 变更操作
  - [ ] `createMutation()`
  - [ ] `updateMutation()`
  - [ ] `deleteMutation()`
- [ ] `JoistInputFactory` 更新输入类型
  - [ ] `updateInputSilk()`
  - [ ] `orderByInputSilk()`
- [ ] 完整的 resolver 生成
  - [ ] `resolver()`
  - [ ] `queriesResolver()`

### Phase 3: 关系处理
- [ ] 引用字段支持
  - [ ] `referenceField()` (ManyToOne / OneToOne)
  - [ ] DataLoader 集成
- [ ] 集合字段支持
  - [ ] `collectionField()` (OneToMany / ManyToMany)
  - [ ] 分页和过滤

### Phase 4: Joist 特有功能
- [ ] GraphQL 过滤器集成
  - [ ] `findGqlQuery()`
  - [ ] `gqlFilterInputSilk()`
- [ ] 响应式字段支持
- [ ] 性能优化
  - [ ] 字段选择优化
  - [ ] 批量操作优化

## 技术挑战与解决方案

### 挑战 1: Joist 元数据获取

**问题**: Joist 通过代码生成生成实体,元数据信息分散在生成的代码中,不像 Prisma 有 DMMF 或 MikroORM 有集中的 MetadataStorage。

**解决方案**:
1. 利用 Joist 生成的 `EntityMetadata` 类型
2. 通过反射获取实体类的属性和装饰器信息
3. 可能需要扫描 Joist 生成的 `metadata.ts` 文件

### 挑战 2: 类型推断

**问题**: 如何正确推断 Joist 实体的 TypeScript 类型?

**解决方案**:
1. 使用 Joist 提供的类型工具 (如 `OptsOf<T>`, `FilterOf<T>`)
2. 实现自定义类型提取工具
3. 充分利用 TypeScript 的条件类型和映射类型

### 挑战 3: GraphQL 过滤器类型生成

**问题**: Joist 的 GraphQL 过滤器类型复杂,需要递归生成。

**解决方案**:
1. 研究 Joist 的 `GraphQLFilterOf<T>` 类型定义
2. 实现递归的 GraphQL Input Type 生成器
3. 支持嵌套关系的过滤

### 挑战 4: 与 EntityManager 集成

**问题**: 如何在 GraphQL resolver 中正确传递和使用 EntityManager?

**解决方案**:
1. 通过 context 传递 EntityManager
2. 类似 MikroORM 的实现,接受 `getEntityManager` 函数
3. 支持事务和请求级别的 EntityManager

## 示例用法

### 基础使用

```typescript
import { weave, resolver, query } from "@gqloom/core"
import { JoistWeaver, joistSilk, JoistResolverFactory } from "@gqloom/joist"
import { Author, Book } from "./entities"
import * as v from "valibot"

// 1. 将 Joist 实体转换为 Silk
const AuthorSilk = joistSilk(Author, {
  fields: {
    // 可选: 自定义字段类型
    email: v.pipe(v.string(), v.email()),
    fullName: v.string() // 计算字段
  }
})

const BookSilk = joistSilk(Book)

// 2. 创建 resolver factory
const authorFactory = new JoistResolverFactory(
  Author,
  async (payload) => payload.context.em
)

// 3. 使用 factory 创建 resolver
const authorResolver = authorFactory.resolver()

// 或者手动组合操作
const customAuthorResolver = resolver({
  findAuthors: authorFactory.findQuery(),
  findAuthor: authorFactory.findOneQuery(),
  createAuthor: authorFactory.createMutation(),
  // 关系字段
  books: authorFactory.collectionField("books"),
})

// 4. 编织 GraphQL Schema
const schema = weave(JoistWeaver, authorResolver)
```

### 使用 GraphQL 过滤器 (Joist 特有)

```typescript
const authorFactory = new JoistResolverFactory(Author, getEntityManager)

const authorResolver = resolver({
  // 使用 Joist 的 findGql
  findGqlAuthors: authorFactory.findGqlQuery(),
})

// GraphQL 查询
// query {
//   findGqlAuthors(
//     filter: {
//       firstName: { contains: "John" }
//       books: { 
//         some: { 
//           publishedAt: { gte: "2020-01-01" }
//         }
//       }
//     }
//   ) {
//     id
//     firstName
//     lastName
//   }
// }
```

### 完整示例

```typescript
import { createYoga } from "graphql-yoga"
import { createServer } from "http"
import { newEntityManager } from "./db"

// 创建所有 resolver
const schema = weave(
  JoistWeaver,
  authorFactory.resolver(),
  bookFactory.resolver(),
  publisherFactory.resolver()
)

// 创建 GraphQL 服务器
const yoga = createYoga({
  schema,
  context: async () => ({
    em: await newEntityManager()
  })
})

createServer(yoga).listen(4000, () => {
  console.log("GraphQL server running on http://localhost:4000/graphql")
})
```

## 与其他 ORM 集成的对比

| 功能                  | Prisma | MikroORM | Drizzle | Joist |
|-----------------------|--------|----------|---------|-------|
| 代码生成              | ✅     | ❌       | ❌      | ✅    |
| 类型安全              | ✅     | ✅       | ✅      | ✅    |
| GraphQL 优化          | ⭐⭐   | ⭐⭐⭐   | ⭐⭐    | ⭐⭐⭐⭐ |
| DataLoader 内置       | ❌     | ✅       | ❌      | ✅    |
| GraphQL 过滤器        | ❌     | ❌       | ❌      | ✅    |
| 元数据访问            | ✅ DMMF| ✅ Meta  | ✅ Table| 🤔 需研究 |
| 关系加载              | ✅     | ✅       | ✅      | ✅    |
| 批量操作              | ✅     | ✅       | ✅      | ✅    |

**图例**: ⭐ 越多表示支持越好,✅ 支持,❌ 不支持,🤔 需要进一步研究

## 建议和后续步骤

### 立即可以做的事情

1. **调研 Joist 元数据**: 深入研究 Joist 生成的代码结构,找到获取实体元数据的最佳方式
2. **创建 POC**: 实现一个最小可行原型,验证核心概念
3. **设计 API**: 参考 MikroORM 和 Prisma 集成,设计 Joist 集成的 API
4. **编写测试**: 准备测试数据库和测试用例

### 需要社区输入的问题

1. **命名约定**: Joist 集成的包名、函数名等是否与现有集成保持一致?
2. **功能范围**: 第一版应该包含哪些功能? GraphQL 过滤器是否应该在 Phase 1 实现?
3. **依赖管理**: Joist 的最低版本要求是什么?

### 预期收益

1. **更好的 GraphQL 体验**: Joist 的 GraphQL 优化功能可以为 GQLoom 用户带来更好的开发体验
2. **生态系统扩展**: 增加对另一个优秀 ORM 的支持,扩大 GQLoom 的用户群
3. **性能提升**: Joist 的内置优化可以提升 GraphQL API 的性能
4. **类型安全**: Joist 的类型系统与 GQLoom 的类型安全理念完美契合

## 结论

Joist ORM 与 GQLoom 的集成具有很高的价值和可行性。Joist 的 GraphQL 友好特性、内置 DataLoader 支持和类型安全设计使其成为 GQLoom 生态系统的理想补充。

建议采用分阶段实现策略,先实现核心功能 (Phase 1),验证可行性后再逐步添加高级功能。整个集成可以参考现有的 MikroORM 和 Prisma 集成,保持 API 的一致性。

最大的挑战在于 Joist 元数据的获取和 GraphQL 过滤器的类型生成,需要深入研究 Joist 的内部实现。但一旦完成,Joist 集成将为 GQLoom 带来独特的价值,特别是在 GraphQL API 的性能和开发体验方面。

## 参考资源

- [Joist 官方文档](https://joist-orm.io/)
- [Joist GraphQL 过滤器](https://joist-orm.io/advanced/graphql-filters)
- [Joist GitHub](https://github.com/joist-orm/joist-orm)
- [GQLoom MikroORM 集成](https://gqloom.dev/docs/schema/mikro-orm)
- [GQLoom Prisma 集成](https://gqloom.dev/docs/schema/prisma)
