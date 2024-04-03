import type {
  GraphQLFieldConfig,
  GraphQLInputObjectType,
  ThunkObjMap,
} from "graphql"
import { GraphQLObjectType } from "graphql"
import type { SilkField } from "./types"
import { mapToFieldConfig, toInputObjectType } from "./utils"

export class ObjectWeaver {
  protected fields = new Map<string, SilkField>()

  protected originObject: GraphQLObjectType
  protected finalObject?: GraphQLObjectType

  protected optionsForGetType: Record<string | symbol | number, any> = {}

  constructor(objectOrGetter: GraphQLObjectType | (() => GraphQLObjectType)) {
    this.originObject =
      typeof objectOrGetter === "function" ? objectOrGetter() : objectOrGetter
  }

  addField(name: string, resolver: SilkField) {
    const existing = this.fields.get(name)
    if (existing && existing !== resolver) {
      throw new Error(`Field ${name} already exists`)
    }
    this.fields.set(name, resolver)
    this.finalObject = undefined
  }

  toGraphQLObjectType(): GraphQLObjectType {
    if (this.finalObject) return this.finalObject
    if (this.fields.size === 0) return this.originObject

    const config = this.originObject.toConfig()

    const fields: ThunkObjMap<GraphQLFieldConfig<any, any, any>> = () => {
      const externalField = mapToFieldConfig(
        this.fields,
        this.optionsForGetType
      )
      return {
        ...config.fields,
        ...externalField,
      }
    }

    this.finalObject = new GraphQLObjectType({ ...config, fields })
    return this.finalObject
  }

  toGraphQLInputObjectType(): GraphQLInputObjectType {
    return toInputObjectType(this.originObject)
  }
}
