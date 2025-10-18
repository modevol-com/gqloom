import { resolver } from "@gqloom/core"
import { PrismaResolverFactory } from "@gqloom/prisma"
import { db } from "../db"
import { User } from "../generated/gqloom"

const userResolverFactory = new PrismaResolverFactory(User, db)

export const userQueriesResolver = userResolverFactory.queriesResolver()

export const userResolver = resolver.of(User, {})
