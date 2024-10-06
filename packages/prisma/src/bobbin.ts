import { PrismaWeaver } from "."
import {
  type PrismaDataModel,
  type PrismaClient,
  type PrismaModelSilk,
} from "./types"
import {
  type FieldOrOperation,
  type GraphQLSilk,
  // createMemoization,
} from "@gqloom/core"

export class PrismaModelBobbin<TModalSilk extends PrismaModelSilk<any, any>> {
  protected modelData: PrismaDataModel
  constructor(
    protected readonly model: TModalSilk,
    protected readonly client: PrismaClient
  ) {
    this.modelData = model.data
  }

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
      output: this.relationFieldOutput(key) as any,
      resolve: (parent) => {
        return parent[key]
      },
    }
  }

  protected relationFieldOutput(
    key: keyof NonNullable<TModalSilk["relations"]>
  ): GraphQLSilk<any> {
    const field = this.model.model.fields.find((field) => field.name === key)
    if (field == null)
      throw new Error(
        `Field ${String(key)} not found in ${this.model.model.name}`
      )
    const outputModel = this.modelData.models[field.type]
    if (outputModel == null) throw new Error(`Model ${field.type} not found`)
    const output = PrismaWeaver.unravel(outputModel, this.modelData)
    if (field.isList) return output.list()
    if (field.isRequired === false) return output.nullable()
    return output
  }
}
