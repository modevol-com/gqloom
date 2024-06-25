/**
 * The symbol to get GraphQL type for schema
 */
export const GET_GRAPHQL_TYPE = Symbol.for("gqloom.get_graphql_type")

/**
 * The symbol to validate and transform input to output
 */
export const PARSE = Symbol.for("gqloom.parse")

/**
 * The symbol to get and store weaver config
 */
export const WEAVER_CONFIG = Symbol.for("gqloom.weaver_config")

/**
 * The symbol to get resolver options
 */
export const RESOLVER_OPTIONS_KEY = Symbol.for("gqloom.resolver-options")

/**
 * The symbol to assign a WeakMap to an object
 */
export const CONTEXT_MEMORY_MAP_KEY = Symbol.for("gqloom.context-memory")
