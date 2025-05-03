import { useContext } from "@gqloom/core/context"
import type { MercuriusContext } from "mercurius"

export function useAuthorization() {
  return useContext<MercuriusContext>().reply.request.headers.authorization
}
