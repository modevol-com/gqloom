import { resolver, mutation } from "@gqloom/valibot"
import * as v from "valibot"
import { authGuard } from "./middlewares"

const AdminResolver = resolver(
  {
    deleteArticle: mutation(v.boolean(), () => true),
  },
  {
    middlewares: [authGuard("admin")],
  }
)

const EditorResolver = resolver(
  {
    createArticle: mutation(v.boolean(), () => true),

    updateArticle: mutation(v.boolean(), () => true),
  },
  { middlewares: [authGuard("editor")] }
)
