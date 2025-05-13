import { catResolver } from "./cat"
import { helloResolver } from "./hello"
import { userResolver } from "./user"

export const resolvers = [helloResolver, userResolver, catResolver]
