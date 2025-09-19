import type { GraphQLNamedType } from "graphql"
import { AUTO_ALIASING } from "../utils/constants"
import type { GlobalWeaverContext, WeaverContext } from "./weaver-context"

export function setAlias(
  namedType: GraphQLNamedType,
  alias: string | undefined,
  context: WeaverContext | GlobalWeaverContext
) {
  if (namedType.name === AUTO_ALIASING) {
    context.autoAliasTypes.add(namedType)
  }

  if (!context.autoAliasTypes.has(namedType) || !alias) return

  if (namedType.name === AUTO_ALIASING) {
    namedType.name = alias
  }
  namedType.name = alias.length < namedType.name.length ? alias : namedType.name
}
