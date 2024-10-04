import { PrismaWeaver } from "@gqloom/prisma"
import datamodel from "./datamodel.json"

const User = PrismaWeaver.unravel(datamodel.models.User)
const Post = PrismaWeaver.unravel(datamodel.models.Post)

export { User, Post }
