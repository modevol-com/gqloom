import { type GraphQLFieldExtensions } from "graphql"

export const GQLOOM_DIRECTIVES_KEY = "gqloom_directives"

export function gqloomDirectives(...directives: string[]) {
  return { [GQLOOM_DIRECTIVES_KEY]: directives }
}

export function extractDirectives({
  extensions,
}: {
  extensions?:
    | Readonly<GraphQLFieldExtensions<any, any, any>>
    | null
    | undefined
}): string[] | undefined {
  const directives = extensions?.[GQLOOM_DIRECTIVES_KEY] as
    | string[]
    | string
    | undefined

  if (typeof directives === "string") {
    return [directives]
  }

  return directives
}
