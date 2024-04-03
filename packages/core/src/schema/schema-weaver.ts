import { GraphQLSchema, isObjectType } from "graphql"
import type {
  AnyGraphQLSilk,
  OperationOrField,
  ResolverOptionsWithParent,
  InputSchema,
} from "../resolver"
import { RESOLVER_OPTIONS_KEY } from "../resolver"
import { SilkObjectType } from "./object-weaver"

type SilkResolver = Record<
  string,
  OperationOrField<any, AnyGraphQLSilk, InputSchema<AnyGraphQLSilk>>
> & {
  [RESOLVER_OPTIONS_KEY]?: ResolverOptionsWithParent
}

interface SchemaWeaverParameters
  extends Partial<
    Record<"query" | "mutation" | "subscription", SilkObjectType>
  > {}

export class SchemaWeaver {
  protected query: SilkObjectType
  protected mutation: SilkObjectType
  protected subscription: SilkObjectType

  protected objectMap = new Map<string, SilkObjectType>()

  protected optionsForGetType: Record<string | symbol | number, any> = {}

  weaveGraphQLSchema(): GraphQLSchema {
    const { query, mutation, subscription } = this
    return new GraphQLSchema({ query, mutation, subscription })
  }

  constructor({ query, mutation, subscription }: SchemaWeaverParameters) {
    this.query = query ?? new SilkObjectType({ name: "Query", fields: {} })
    this.mutation =
      mutation ?? new SilkObjectType({ name: "Mutation", fields: {} })
    this.subscription =
      subscription ?? new SilkObjectType({ name: "Subscription", fields: {} })
  }

  addResolver(resolver: SilkResolver) {
    const parent = resolver[RESOLVER_OPTIONS_KEY]?.parent
    const parentSilkObject = (() => {
      if (parent == null) return undefined
      const gqlType = parent.getType(this.optionsForGetType)
      if (isObjectType(gqlType)) {
        const { optionsForGetType, objectMap } = this
        const silkObject = new SilkObjectType(gqlType, {
          optionsForGetType,
          objectMap,
        })
        this.objectMap.set(gqlType.name, silkObject)
        return silkObject
      }
      throw new Error(
        `${(gqlType as any)?.name ?? gqlType.toString()} is not an object type`
      )
    })()

    Object.entries(resolver).forEach(([name, operation]) => {
      if ((name as any) === RESOLVER_OPTIONS_KEY) return
      if (operation.type === "field") {
        if (parentSilkObject == null) return
        parentSilkObject.addField(name, operation)
      } else {
        const silkObject = this.getOperationSilkObject(operation.type)
        silkObject.addField(name, operation)
      }
    })
  }

  protected getOperationSilkObject(
    type: "query" | "mutation" | "subscription"
  ): SilkObjectType {
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
