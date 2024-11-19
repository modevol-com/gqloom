import { mutation, resolver } from "@gqloom/core"
import * as v from "valibot"
import { authGuard } from "./middlewares"

export const AdminResolver = resolver(
  {
    deleteArticle: mutation(v.boolean(), () => true),
  },
  {
    middlewares: [authGuard("admin")],
  }
)

export const EditorResolver = resolver(
  {
    createArticle: mutation(v.boolean(), () => true),

    updateArticle: mutation(v.boolean(), () => true),
  },
  { middlewares: [authGuard("editor")] }
)
