import * as Core from "@gqloom/core"

/**
 * @deprecated
 * Do not import this from `@gqloom/zod`, import from `@gqloom/core` instead.
 *
 * 🚫 Do not do this:
 * ```ts
 * import { resolver } from "@gqloom/zod"
 * ```
 * ✅ Do this:
 * ```ts
 * import { resolver } from "@gqloom/core"
 * ```
 */
const resolver = Core.resolver

/**
 * @deprecated
 * Do not import this from `@gqloom/zod`, import from `@gqloom/core` instead.
 *
 * 🚫 Do not do this:
 * ```ts
 * import { query } from "@gqloom/zod"
 * ```
 * ✅ Do this:
 * ```ts
 * import { query } from "@gqloom/core"
 * ```
 */
const query = Core.query

/**
 * @deprecated
 * Do not import this from `@gqloom/zod`, import from `@gqloom/core` instead.
 *
 * 🚫 Do not do this:
 * ```ts
 * import { mutation } from "@gqloom/zod"
 * ```
 * Instead, do this:
 * ```ts
 * import { mutation } from "@gqloom/core"
 * ```
 */
const mutation = Core.mutation

/**
 * @deprecated
 * Do not import this from `@gqloom/zod`, import from `@gqloom/core` instead.
 *
 * 🚫 Do not do this:
 * ```ts
 * import { field } from "@gqloom/zod"
 * ```
 * ✅ Do this:
 * ```ts
 * import { field } from "@gqloom/core"
 * ```
 */
const field = Core.field

/**
 * @deprecated
 * Do not import this from `@gqloom/zod`, import from `@gqloom/core` instead.
 *
 * 🚫 Do not do this:
 * ```ts
 * import { subscription } from "@gqloom/zod"
 * ```
 * ✅ Do this:
 * ```ts
 * import { subscription } from "@gqloom/core"
 * ```
 */
const subscription = Core.subscription

/**
 * @deprecated
 * Do not import this from `@gqloom/zod`, import from `@gqloom/core` instead.
 *
 * 🚫 Do not do this:
 * ```ts
 * import { weave } from "@gqloom/zod"
 * ```
 * ✅ Do this:
 * ```ts
 * import { weave } from "@gqloom/core"
 * ```
 */
const weave = Core.weave

export { resolver, query, mutation, field, subscription, weave }
