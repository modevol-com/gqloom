import type { GraphQLNamedType } from "graphql"
import { AUTO_ALIASING } from "../utils/constants"
import { weaverContext } from "./weaver-context"

export function setAlias(
  namedType: GraphQLNamedType,
  alias: string | undefined
) {
  if (namedType.name === AUTO_ALIASING) {
    weaverContext.autoAliasTypes.add(namedType)
  }

  if (!weaverContext.autoAliasTypes.has(namedType) || !alias) return

  if (namedType.name === AUTO_ALIASING) {
    namedType.name = alias
  }
  namedType.name = alias.length < namedType.name.length ? alias : namedType.name
}
