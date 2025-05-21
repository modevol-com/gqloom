import { mutation, resolver } from "@gqloom/core"
import * as v from "valibot"
import { authGuard } from "./middlewares"

export const adminResolver = resolver({
  deleteArticle: mutation(v.boolean(), () => true),
})

adminResolver.use(authGuard("admin"))

export const editorResolver = resolver({
  createArticle: mutation(v.boolean(), () => true),

  updateArticle: mutation(v.boolean(), () => true),
})

editorResolver.use(authGuard("editor"))
