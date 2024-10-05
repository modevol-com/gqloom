import { type PrismaClient, type PrismaModelSilk } from "./types"
import {
  type FieldOrOperation,
  type GraphQLSilk,
  createMemoization,
} from "@gqloom/core"

export class PrismaModelBobbin<TModalSilk extends PrismaModelSilk<any, any>> {
  constructor(
    protected readonly model: TModalSilk,
    protected readonly client: PrismaClient
  ) {}

  public relationField<TKey extends keyof NonNullable<TModalSilk["relations"]>>(
    key: TKey
  ): FieldOrOperation<
    TModalSilk,
    GraphQLSilk<NonNullable<TModalSilk["relations"]>[TKey]>,
    undefined,
    "field"
  > {
    return {
      type: "field",
      input: undefined,
      output: this.model.relations[key],
      resolve: (parent) => {
        return parent[key]
      },
    }
  }
}
