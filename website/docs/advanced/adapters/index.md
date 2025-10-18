<script setup>
import { FeatureCard } from '@/components/feature-card'
</script>
# Adapters

There are a number of GraphQL HTTP adapters in the Node.js ecosystem.

Since the product of the GQLoom weave is a standard GraphQL Schema object, it works seamlessly with these adapters.

Here are some popular adapters:

<div class="vp-raw grid grid-cols-1 gap-4 sm:grid-cols-2 mt-12">
  <FeatureCard 
    to="./adapters/yoga" 
    title="Yoga" 
    description="Rewrite of a fully-featured GraphQL Server with focus on easy setup, performance & great developer experience."
  />
  <FeatureCard
    to="./adapters/apollo"
    title="Apollo Server"
    description="pec-compliant and production ready JavaScript GraphQL server that lets you develop in a schema-first way. Built for Express, Connect, Hapi, Koa, and more."
  />
  <FeatureCard
    to="./adapters/mercurius"
    title="Mercurius"
    description="Implement GraphQL servers and gateways with Fastify."
  />  
  <FeatureCard
    to="./adapters/hono"
    title="Hono"
    description="Hono is a small, simple, and extremely fast web framework built based on web standards and capable of running in various JavaScript runtime environments."
  />
  <FeatureCard
    to="./adapters/elysia"
    title="Elysia"
    description="Elysia is an ergonomic web framework for building backend servers with Bun"
  />
</div>