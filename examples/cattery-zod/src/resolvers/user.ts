import { mutation, query, resolver } from "@gqloom/core"
import { z } from "zod"
import { users } from "../schema"
import { userService } from "../services"

export const userResolver = resolver({
  usersByName: query(users.$list())
    .input({ name: z.string() })
    .resolve(({ name }) => userService.findUsersByName(name)),

  userByPhone: query(users.$nullable())
    .input({ phone: z.string() })
    .resolve(({ phone }) => userService.findUserByPhone(phone)),

  createUser: mutation(users)
    .input({
      data: z.object({
        name: z.string(),
        phone: z.string(),
      }),
    })
    .resolve(async ({ data }) => userService.createUser(data)),
})
