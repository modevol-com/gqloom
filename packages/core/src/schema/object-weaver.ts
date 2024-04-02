import { GraphQLObjectType } from "graphql"
import { GraphQLInputObjectType } from "graphql"
import type { SilkField } from "./types"
import { mapToFieldConfig } from "./utils"

export class ObjectWeaver {
  protected fields = new Map<string, SilkField>()

  protected originObject: GraphQLObjectType

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
  }

  toGraphQLObjectType(): GraphQLObjectType {
    if (this.fields.size === 0) return this.originObject
    const config = this.originObject.toConfig()
    const externalField = mapToFieldConfig(this.fields, this.optionsForGetType)

    return new GraphQLObjectType({
      ...config,
      fields: { ...config.fields, ...externalField },
    })
  }

  toGraphQLInputObjectType(): GraphQLInputObjectType {
    return new GraphQLInputObjectType({
      name: "TODO",
      fields: {},
    })
  }
}
