import { GraphQLSchema, isObjectType } from "graphql"
import { RESOLVER_OPTIONS_KEY, type ResolvingOptions } from "../resolver"
import { ModifiableObjectType } from "./object"
import { type Middleware } from "../utils"
import {
  initWeaverContext,
  provideWeaverContext,
  type WeaverContext,
} from "./weaver-context"
import { type SilkResolver } from "./types"

interface SchemaWeaverParameters
  extends Partial<
    Record<"query" | "mutation" | "subscription", ModifiableObjectType>
  > {}

export class SchemaWeaver {
  protected query?: ModifiableObjectType
  protected mutation?: ModifiableObjectType
  protected subscription?: ModifiableObjectType

  protected context: WeaverContext = initWeaverContext()

  protected optionsForGetType: Record<string | symbol | number, any> = {}
  protected optionsForResolving?: ResolvingOptions

  public use(...middlewares: Middleware[]) {
    this.optionsForResolving ??= { middlewares: [] }
    this.optionsForResolving.middlewares ??= []
    this.optionsForResolving.middlewares.push(...middlewares)
    return this
  }

  public weaveGraphQLSchema(): GraphQLSchema {
    const { query, mutation, subscription } = this
    return new GraphQLSchema({ query, mutation, subscription })
  }

  constructor({ query, mutation, subscription }: SchemaWeaverParameters = {}) {
    if (query != null) this.query = query
    if (mutation != null) this.mutation = mutation
    if (subscription != null) this.subscription = subscription
  }

  public add(resolver: SilkResolver) {
    const answer = provideWeaverContext(
      () => this.addResolver(resolver),
      this.context
    )
    return answer
  }

  protected addResolver(resolver: SilkResolver) {
    const parent = resolver[RESOLVER_OPTIONS_KEY]?.parent
    const parentObject = (() => {
      if (parent == null) return undefined
      const gqlType = parent.getType(this.optionsForGetType)
      if (isObjectType(gqlType)) {
        const existing = this.context.modifiableObjectMap.get(gqlType)
        if (existing != null) return existing
        const extraObject = new ModifiableObjectType(gqlType, this.fieldOptions)
        this.context.modifiableObjectMap.set(gqlType, extraObject)
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
    const { optionsForGetType, optionsForResolving, context } = this
    return { optionsForGetType, optionsForResolving, weaverContext: context }
  }
}
