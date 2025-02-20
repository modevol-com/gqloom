import { useContext } from "@gqloom/core"
import type { Context } from "hono"

export function useAuthorization() {
  return useContext<Context>().req.header().authorization
}
