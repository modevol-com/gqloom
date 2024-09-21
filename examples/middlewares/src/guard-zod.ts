import { resolver, mutation } from "@gqloom/zod"
import { z } from "zod"
import { authGuard } from "./middlewares"

const AdminResolver = resolver(
  {
    deleteArticle: mutation(z.boolean(), () => true),
  },
  {
    middlewares: [authGuard("admin")],
  }
)

const EditorResolver = resolver(
  {
    createArticle: mutation(z.boolean(), () => true),

    updateArticle: mutation(z.boolean(), () => true),
  },
  { middlewares: [authGuard("editor")] }
)
