import { useContext } from "@gqloom/core/context"
import type { YogaInitialContext } from "graphql-yoga"

export function useAuthorization() {
  return useContext<YogaInitialContext>().request.headers.get("Authorization")
}
