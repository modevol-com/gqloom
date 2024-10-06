import type { PrismaModelSilk, PrismaEnumSilk } from "../../dist"
import type {
  User as IUser,
  Post as IPost,
} from "/Users/xcfox/Documents/code/github/gqloom/node_modules/.pnpm/@prisma+client@5.20.0_prisma@5.20.0/node_modules/@prisma/client"

export const User: PrismaModelSilk<IUser, { posts: IPost[] }>
export const Post: PrismaModelSilk<IPost, { author?: IUser }>

export { IUser, IPost }
