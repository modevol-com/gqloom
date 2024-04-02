import { GraphQLSchema, isObjectType } from "graphql"
import type {
  AnyGraphQLSilk,
  OperationOrField,
  ResolverOptionsWithParent,
  InputSchema,
} from "../resolver"
import { RESOLVER_OPTIONS_KEY } from "../resolver"
import type {
  SilkQuery,
  SilkMutation,
  SilkSubscription,
  SilkField,
} from "./types"
import { ObjectWeaver } from "./object-weaver"

type SilkResolver = Record<
  string,
  OperationOrField<any, AnyGraphQLSilk, InputSchema<AnyGraphQLSilk>>
> & {
  [RESOLVER_OPTIONS_KEY]?: ResolverOptionsWithParent
}

export class SchemaWeaver {
  protected queries = new Map<string, SilkQuery>()
  protected mutations = new Map<string, SilkMutation>()
  protected subscriptions = new Map<string, SilkSubscription>()

  protected objectWeavers = new Map<string, ObjectWeaver>()

  protected optionsForGetType: Record<string | symbol | number, any> = {}

  weaveGraphQLSchema(): GraphQLSchema {
    return new GraphQLSchema({})
  }

  addResolver(resolver: SilkResolver) {
    const parent = resolver[RESOLVER_OPTIONS_KEY]?.parent
    const parentWeaver = (() => {
      if (parent == null) return undefined
      const gqlType = parent.getType(this.optionsForGetType)
      if (isObjectType(gqlType)) return new ObjectWeaver(gqlType)
      throw new Error(
        `${(gqlType as any)?.name ?? gqlType.toString()} is not an object type`
      )
    })()

    Object.entries(resolver).forEach(([name, operation]) => {
      if ((name as any) === RESOLVER_OPTIONS_KEY) return
      if (operation.type === "field") {
        if (parentWeaver == null) return
        parentWeaver.addField(name, operation as SilkField)
      } else {
        const map = this.getOperationMap(operation.type)
        const existing = map.get(name)
        if (existing && existing !== operation) {
          throw new Error(`${operation.type} ${name} already exists`)
        }
        map.set(name, operation)
      }
    })
  }

  protected getOperationMap(
    type: "query" | "mutation" | "subscription"
  ): Map<
    string,
    OperationOrField<any, AnyGraphQLSilk, InputSchema<AnyGraphQLSilk>>
  > {
    switch (type) {
      case "query":
        return this.queries
      case "mutation":
        return this.mutations
      case "subscription":
        return this.subscriptions
    }
  }
}
