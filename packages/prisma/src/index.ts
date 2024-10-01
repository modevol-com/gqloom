import { type GraphQLSilk, SYMBOLS, silk } from "@gqloom/core"
import { type DMMF } from "@prisma/generator-helper"
import { GraphQLObjectType } from "graphql"

export class PrismaWeaver {
  static unravel<TModal>(model: DMMF.Model): PrismaModelSilk<TModal> {
    return {
      [SYMBOLS.GET_GRAPHQL_TYPE]: () =>
        PrismaWeaver.getGraphQLTypeByModel(model),
      nullable() {
        return silk.nullable(this as GraphQLSilk)
      },
      list() {
        return silk.list(this) as GraphQLSilk<TModal[]>
      },
    }
  }

  static getGraphQLTypeByModel(model: DMMF.Model): GraphQLObjectType {
    return new GraphQLObjectType({
      name: model.name,
      fields: () => ({}),
    })
  }
}

export interface PrismaModelSilk<TModel> extends GraphQLSilk<TModel> {
  nullable(): GraphQLSilk<TModel | null>
  list(): GraphQLSilk<TModel[]>
}
