import { useResolverPayload } from "@gqloom/core/context"
import type { DMMF } from "@prisma/generator-helper"
import type { PrismaModelSilk, SelectedModelFields } from "./types"
import { getSelectedFields } from "./utils"

/**
 * Get the selected columns from the resolver payload
 * @param silk - The silk to get the selected columns from
 * @returns The selected columns
 */
export function useSelectedFields<
  TSilk extends PrismaModelSilk<unknown, string, Record<string, unknown>>,
>(silk: TSilk): SelectedModelFields<TSilk> /**
 * Get the selected columns from the resolver payload
 * @param silk - The silk to get the selected columns from
 * @param payload - The resolver payload
 * @returns The selected columns
 */
export function useSelectedFields(model: DMMF.Model): Record<string, boolean>
/**
 * Get the selected columns from the resolver payload
 * @param silk - The silk to get the selected columns from
 * @param payload - The resolver payload
 * @returns The selected columns
 */
export function useSelectedFields(
  silkOrModel:
    | PrismaModelSilk<unknown, string, Record<string, unknown>>
    | DMMF.Model
): Record<string, boolean> {
  return getSelectedFields(silkOrModel as any, useResolverPayload())
}
