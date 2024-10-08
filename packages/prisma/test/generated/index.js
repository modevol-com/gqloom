import { PrismaWeaver } from "../../dist"
import datamodel from "./datamodel.json"

const User = PrismaWeaver.unravel(datamodel.models.User, datamodel)
const Profile = PrismaWeaver.unravel(datamodel.models.Profile, datamodel)
const Post = PrismaWeaver.unravel(datamodel.models.Post, datamodel)
const Category = PrismaWeaver.unravel(datamodel.models.Category, datamodel)
const Cat = PrismaWeaver.unravel(datamodel.models.Cat, datamodel)
const Dog = PrismaWeaver.unravel(datamodel.models.Dog, datamodel)

export { User, Profile, Post, Category, Cat, Dog }
