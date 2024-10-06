import { PrismaWeaver } from "../../dist"
import datamodel from "./datamodel.json"

const User = PrismaWeaver.unravel(datamodel.models.User, datamodel)
const Post = PrismaWeaver.unravel(datamodel.models.Post, datamodel)

export { User, Post }
