const { PrismaWeaver } = require("../../dist")
const datamodel = require("./datamodel.json")

const User = PrismaWeaver.unravel(datamodel.models.User, datamodel)
const Post = PrismaWeaver.unravel(datamodel.models.Post, datamodel)


module.exports = {
  User,
  Post,
}