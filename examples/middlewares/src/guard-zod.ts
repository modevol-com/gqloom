import { mutation, resolver } from "@gqloom/zod"
import { z } from "zod"
import { authGuard } from "./middlewares"

export const AdminResolver = resolver(
  {
    deleteArticle: mutation(z.boolean(), () => true),
  },
  {
    middlewares: [authGuard("admin")],
  }
)

export const EditorResolver = resolver(
  {
    createArticle: mutation(z.boolean(), () => true),

    updateArticle: mutation(z.boolean(), () => true),
  },
  { middlewares: [authGuard("editor")] }
)
