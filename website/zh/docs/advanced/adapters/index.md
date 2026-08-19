<script setup>
import { FeatureCard } from '@/components/feature-card'
</script>
# 适配器

在 Node.js 生态中，有许多 GraphQL HTTP 适配器。

由于 GQLoom 编织的产物是标准的 GraphQL Schema 对象，因此可以无缝地与这些适配器工作。

以下是一些流行的适配器：

<div class="vp-raw grid grid-cols-1 gap-4 sm:grid-cols-2 mt-12">
  <FeatureCard 
    to="./yoga" 
    title="Yoga" 
    description="重写了功能齐全的 GraphQL 服务器，重点关注简便的设置、性能和良好的开发人员体验。"
  />
  <FeatureCard
    to="./apollo"
    title="Apollo Server"
    description="符合规范且可用于生产的 JavaScript GraphQL 服务器，可让您以模式优先的方式进行开发。专为 Express、Connect、Hapi、Koa 等而构建"
  />
  <FeatureCard
    to="./mercurius"
    title="Mercurius"
    description="使用 Fastify 实现 GraphQL 服务器和网关。"
  />
  <FeatureCard
    to="./hono"
    title="Hono"
    description="Hono 是一个小巧、简单且超快速的 Web 框架，基于 Web 标准构建，能够在多种 JavaScript 运行时环境中运行。"
  />
  <FeatureCard
    to="./elysia"
    title="Elysia"
    description="Elysia 是一个符合人体工程学的 Web 框架，用于使用 Bun 构建后端服务器。"
  />
</div>