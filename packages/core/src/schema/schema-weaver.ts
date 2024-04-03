import { GraphQLSchema, isObjectType } from "graphql"
import type {
  AnyGraphQLSilk,
  OperationOrField,
  ResolverOptionsWithParent,
  InputSchema,
} from "../resolver"
import { RESOLVER_OPTIONS_KEY } from "../resolver"
import { ExtraObjectType } from "./object"

type SilkResolver = Record<
  string,
  OperationOrField<any, AnyGraphQLSilk, InputSchema<AnyGraphQLSilk>>
> & {
  [RESOLVER_OPTIONS_KEY]?: ResolverOptionsWithParent
}

interface SchemaWeaverParameters
  extends Partial<
    Record<"query" | "mutation" | "subscription", ExtraObjectType>
  > {}

export class SchemaWeaver {
  protected query: ExtraObjectType
  protected mutation: ExtraObjectType
  protected subscription: ExtraObjectType

  protected objectMap = new Map<string, ExtraObjectType>()

  protected optionsForGetType: Record<string | symbol | number, any> = {}

  weaveGraphQLSchema(): GraphQLSchema {
    const { query, mutation, subscription } = this
    return new GraphQLSchema({ query, mutation, subscription })
  }

  constructor({ query, mutation, subscription }: SchemaWeaverParameters) {
    this.query = query ?? new ExtraObjectType({ name: "Query", fields: {} })
    this.mutation =
      mutation ?? new ExtraObjectType({ name: "Mutation", fields: {} })
    this.subscription =
      subscription ?? new ExtraObjectType({ name: "Subscription", fields: {} })
  }

  addResolver(resolver: SilkResolver) {
    const parent = resolver[RESOLVER_OPTIONS_KEY]?.parent
    const parentObject = (() => {
      if (parent == null) return undefined
      const gqlType = parent.getType(this.optionsForGetType)
      if (isObjectType(gqlType)) {
        const { optionsForGetType, objectMap } = this
        const extraObject = new ExtraObjectType(gqlType, {
          optionsForGetType,
          objectMap,
        })
        this.objectMap.set(gqlType.name, extraObject)
        return extraObject
      }
      throw new Error(
        `${(gqlType as any)?.name ?? gqlType.toString()} is not an object type`
      )
    })()

    Object.entries(resolver).forEach(([name, operation]) => {
      if ((name as any) === RESOLVER_OPTIONS_KEY) return
      if (operation.type === "field") {
        if (parentObject == null) return
        parentObject.addField(name, operation)
      } else {
        const operationObject = this.getOperationObject(operation.type)
        operationObject.addField(name, operation)
      }
    })
  }

  protected getOperationObject(
    type: "query" | "mutation" | "subscription"
  ): ExtraObjectType {
    switch (type) {
      case "query":
        return this.query
      case "mutation":
        return this.mutation
      case "subscription":
        return this.subscription
    }
  }
}
