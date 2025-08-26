import type { FeatureProps } from "./feature-card"
import type { IHighlight } from "./highlight"

export const highlights: IHighlight[] = [
  {
    emoji: "🧩",
    heading: "丰富集成",
    text: "使用你最熟悉的验证库和 ORM 来建构你的下一个 GraphQL 应用；",
  },
  {
    emoji: "🔒",
    heading: "类型安全",
    text: "从 Schema 自动推导类型，在开发时享受智能提示，在编译时发现潜在问题；",
  },
  {
    emoji: "🔋",
    heading: "整装待发",
    text: "中间件、上下文、订阅、联邦图已经准备就绪；",
  },
  {
    emoji: "🔮",
    heading: "抛却魔法",
    text: "没有装饰器、没有元数据和反射、没有代码生成，只需要 JavaScript/TypeScript 就可以在任何地方运行；",
  },
  {
    emoji: "🧑‍💻",
    heading: "开发体验",
    text: "更少的样板代码、语义化的 API 设计、广泛的生态集成使开发愉快；",
  },
]

export const features: FeatureProps[] = [
  {
    icon: "RadioTower",
    title: "解析器（Resolver）",
    description:
      "解析器是 GQLoom 的核心组件，你可以在其中定义查询、变更和订阅操作，还能为对象动态添加额外字段，实现灵活的数据处理。",
    to: "./docs/resolver",
  },
  {
    icon: "Shuffle",
    title: "上下文（Context）",
    description:
      "借助上下文机制，你能够在应用程序的任意位置便捷地进行数据注入，确保数据在不同组件和层次间高效流通。",
    to: "./docs/context",
  },
  {
    icon: "Fence",
    title: "中间件（Middleware）",
    description:
      "采用面向切面编程的思想，中间件允许你在解析过程中无缝嵌入额外逻辑，如错误捕获、用户权限校验和日志追踪，增强系统的健壮性和可维护性。",
    to: "./docs/middleware",
  },
  {
    icon: "HardDriveDownload",
    title: "数据加载器（Dataloader）",
    description:
      "数据加载器是优化性能的利器，它能够批量获取数据，显著减少数据库的查询次数，有效提升系统性能，同时让代码结构更加清晰，易于维护。",
    to: "./docs/dataloader",
  },
  {
    icon: "SatelliteDish",
    title: "订阅（Subscription）",
    description:
      "订阅功能为客户端提供了实时获取数据更新的能力，无需手动轮询，确保客户端始终与服务器数据保持同步，提升用户体验。",
    to: "./docs/advanced/subscription",
  },
  {
    icon: "Satellite",
    title: "联邦图（Federation）",
    description:
      "联邦图是一种微服务化的 GraphQL 架构，它能够轻松聚合多个服务，实现跨服务查询，让你可以像操作单个图一样管理复杂的分布式系统。",
    to: "./docs/advanced/federation",
  },
]

export const gqlHighlights: IHighlight[] = [
  {
    emoji: "🔐",
    heading: "类型安全",
    text: "强类型查询语言，可以确保从服务端到客户端数据的一致性和安全性。",
  },
  {
    emoji: "🧩",
    heading: "灵活聚合",
    text: "自动聚合多个查询，既减少客户端的请求次数，也保证服务端 API 的简洁性。",
  },
  {
    emoji: "🚀",
    heading: "高效查询",
    text: "客户端可以指定所需的数据结构，从而减少不必要的数据传输，提高 API 的性能和可维护性。",
  },
  {
    emoji: "🔌",
    heading: "易于扩展",
    text: "通过添加新的字段和类型来扩展 API，而不需要修改现有的代码。",
  },
  {
    emoji: "👥",
    heading: "高效协作",
    text: "使用 Schema 作为文档，减少沟通成本，提高开发效率。",
  },
  {
    emoji: "🌳",
    heading: "繁荣生态",
    text: "各类工具与框架不断推陈出新，社区活跃且发展迅速，应用领域广泛且未来前景广阔。",
  },
]

export const ormIntro = {
  title: "增删改查接口已就绪",
  descriptions: [
    "恰似以精巧技艺织就锦章，将精准定义的数据库表格毫无瑕疵地嵌入 GraphQL Schema 架构体系，达成数据库表格与接口之间的无缝对接。",
    "仅需编写少量代码，即可从数据库表格出发，举重若轻地搭建起增删改查操作体系，全方位沉浸于对象关系映射（ORM）技术所赋予的便捷体验之中。",
    "不光是解析器能够灵活塑造，即便是单一操作，也可通过巧妙融入输入项与中间件，达成独具匠心的定制效果，精准贴合多样化需求。",
    "凭借高度灵活的构建策略，游刃余地对解析器进行拼接组合，毫无阻碍地在数据图中植入各类操作，充分挖掘并拓展无限可能。",
  ],
}
