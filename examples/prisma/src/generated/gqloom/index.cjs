const { PrismaWeaver } = require("@gqloom/prisma")
const datamodel = require("./datamodel.json")


const User = PrismaWeaver.unravel(datamodel.models.User)
const Post = PrismaWeaver.unravel(datamodel.models.Post)


module.exports = {
  User,
  Post,
}