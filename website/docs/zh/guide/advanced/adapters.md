# 适配器

在 Node.js 生态中，有许多 GraphQL HTTP 适配器。

由于 GQLoom 编织的产物是标准的 GraphQL Schema 对象，因此可以无缝地与这些适配器工作。

以下是一些流行的适配器：

- [Yoga](./adapters/yoga): 🧘 重写了功能齐全的 GraphQL 服务器，重点关注简便的设置、性能和良好的开发人员体验。Yoga 的核心实现了 WHATWG Fetch API，可在任何 JS 环境中运行/部署。

- [Apollo](./adapters/apollo): 🌍 符合规范且可用于生产的 JavaScript GraphQL 服务器，可让您以模式优先的方式进行开发。专为 Express、Connect、Hapi、Koa 等而构建。

- [Mercurius](./adapters/mercurius): 使用 Fastify 实现 GraphQL 服务器和网关。
