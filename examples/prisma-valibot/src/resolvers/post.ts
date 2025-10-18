import { resolver } from "@gqloom/core"
import { PrismaResolverFactory } from "@gqloom/prisma"
import { db } from "../db"
import { Post } from "../generated/gqloom"

const postResolverFactory = new PrismaResolverFactory(Post, db)

export const postQueriesResolver = postResolverFactory.queriesResolver()

export const postResolver = resolver.of(Post, {})
