import { PrismaWeaver } from "../../dist"
import mm from "./model-meta.json"

const User = PrismaWeaver.unravel(mm.models.User, mm)
const Profile = PrismaWeaver.unravel(mm.models.Profile, mm)
const Post = PrismaWeaver.unravel(mm.models.Post, mm)
const Category = PrismaWeaver.unravel(mm.models.Category, mm)
const Cat = PrismaWeaver.unravel(mm.models.Cat, mm)
const Dog = PrismaWeaver.unravel(mm.models.Dog, mm)


export {
  User,
  Profile,
  Post,
  Category,
  Cat,
  Dog,
}