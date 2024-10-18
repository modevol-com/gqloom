import type { PrismaModelSilk, PrismaEnumSilk } from "../../dist"
import type {
  User as IUser,
  Profile as IProfile,
  Post as IPost,
  Category as ICategory,
  Cat as ICat,
  Dog as IDog,
} from "/Users/xcfox/Documents/code/github/gqloom/node_modules/.pnpm/@prisma+client@5.20.0_prisma@5.20.0/node_modules/@prisma/client"

export const User: PrismaModelSilk<
  IUser,
  "user",
  { posts: IPost[]; publishedPosts: IPost[]; profile?: IProfile }
>
export const Profile: PrismaModelSilk<IProfile, "profile", { user: IUser }>
export const Post: PrismaModelSilk<
  IPost,
  "post",
  { author: IUser; publisher?: IUser; categories: ICategory[] }
>
export const Category: PrismaModelSilk<
  ICategory,
  "category",
  { posts: IPost[] }
>
export const Cat: PrismaModelSilk<ICat, "cat">
export const Dog: PrismaModelSilk<IDog, "dog">

export { IUser, IProfile, IPost, ICategory, ICat, IDog }
