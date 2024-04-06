import { GraphQLSchema, isObjectType } from "graphql"
import type { OperationOrField, ResolverOptionsWithParent } from "../resolver"
import { RESOLVER_OPTIONS_KEY } from "../resolver"
import { ModifiableObjectType } from "./object"
import type { InputMap } from "./types"

type SilkResolver = Record<string, OperationOrField<any, any, any, any>> & {
  [RESOLVER_OPTIONS_KEY]?: ResolverOptionsWithParent
}

interface SchemaWeaverParameters
  extends Partial<
    Record<"query" | "mutation" | "subscription", ModifiableObjectType>
  > {}

export class SchemaWeaver {
  protected query?: ModifiableObjectType
  protected mutation?: ModifiableObjectType
  protected subscription?: ModifiableObjectType

  protected objectMap = new Map<string, ModifiableObjectType>()
  protected inputMap: InputMap = new Map()

  protected optionsForGetType: Record<string | symbol | number, any> = {}

  weaveGraphQLSchema(): GraphQLSchema {
    const { query, mutation, subscription } = this
    return new GraphQLSchema({ query, mutation, subscription })
  }

  constructor({ query, mutation, subscription }: SchemaWeaverParameters = {}) {
    if (query != null) this.query = query
    if (mutation != null) this.mutation = mutation
    if (subscription != null) this.subscription = subscription
  }

  addResolver(resolver: SilkResolver) {
    const parent = resolver[RESOLVER_OPTIONS_KEY]?.parent
    const parentObject = (() => {
      if (parent == null) return undefined
      const gqlType = parent.getType(this.optionsForGetType)
      if (isObjectType(gqlType)) {
        const extraObject = new ModifiableObjectType(gqlType, this.fieldOptions)
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
    return this
  }

  protected getOperationObject(
    type: "query" | "mutation" | "subscription"
  ): ModifiableObjectType {
    switch (type) {
      case "query":
        if (this.query) return this.query
        return (this.query = new ModifiableObjectType(
          { name: "Query", fields: {} },
          this.fieldOptions
        ))
      case "mutation":
        if (this.mutation) return this.mutation
        return (this.mutation = new ModifiableObjectType(
          { name: "Mutation", fields: {} },
          this.fieldOptions
        ))
      case "subscription":
        if (this.subscription) return this.subscription
        return (this.subscription = new ModifiableObjectType(
          { name: "Subscription", fields: {} },
          this.fieldOptions
        ))
    }
  }

  protected get fieldOptions() {
    const { optionsForGetType, objectMap, inputMap } = this
    return { optionsForGetType, objectMap, inputMap }
  }
}
