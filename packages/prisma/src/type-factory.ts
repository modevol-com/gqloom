import {
  type GraphQLSilk,
  isSilk,
  provideWeaverContext,
  type StandardSchemaV1,
  SYMBOLS,
  silk,
  weaverContext,
} from "@gqloom/core"
import type { DMMF } from "@prisma/generator-helper"
import {
  GraphQLEnumType,
  type GraphQLEnumValueConfig,
  type GraphQLFieldConfig,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  type GraphQLOutputType,
  GraphQLScalarType,
  isListType,
  isNonNullType,
  isOutputType,
} from "graphql"
import { PrismaWeaver } from "."
import type {
  AnyPrismaModelSilk,
  InferTModelSilkName,
  PrismaInputOperation,
  PrismaModelConfig,
  PrismaModelFieldBehavior,
  PrismaModelFieldBehaviors,
  PrismaModelMeta,
  PrismaTypes,
} from "./types"
import { gqlType as gt } from "./utils"

export class PrismaTypeFactory<
  TModelSilk extends AnyPrismaModelSilk = AnyPrismaModelSilk,
> {
  protected modelMeta: Required<PrismaModelMeta>
  protected modelName: string | undefined

  public constructor(silkOrModelMeta: TModelSilk | PrismaModelMeta) {
    if (isSilk(silkOrModelMeta)) {
      this.modelMeta = PrismaTypeFactory.indexModelMeta(silkOrModelMeta.meta)
      this.modelName = silkOrModelMeta.name
    } else {
      this.modelMeta = PrismaTypeFactory.indexModelMeta(silkOrModelMeta)
    }
  }

  public static getOperationByName(name: string): PrismaInputOperation {
    if (
      name.endsWith("WhereInput") ||
      name.endsWith("WhereUniqueInput") ||
      name.endsWith("OrderByWithRelationInput") ||
      name.endsWith("ScalarWhereInput") ||
      name.endsWith("Filter")
    ) {
      return "filters"
    }

    if (
      name.endsWith("CreateInput") ||
      name.endsWith("CreateManyInput") ||
      name.includes("CreateWithout")
    )
      return "create"
    if (
      name.endsWith("UpdateInput") ||
      name.endsWith("UpdateManyMutationInput") ||
      name.includes("UpdateWithout") ||
      name.includes("Upsert")
    )
      return "update"
    return "filters"
  }

  public getSilk<
    TName extends keyof PrismaTypes[InferTModelSilkName<TModelSilk>],
  >(
    name: TName
  ): GraphQLSilk<PrismaTypes[InferTModelSilkName<TModelSilk>][TName]> {
    return silk(() => this.inputType(String(name))) as GraphQLSilk<
      PrismaTypes[InferTModelSilkName<TModelSilk>][TName]
    >
  }

  public inputType(name: string): GraphQLObjectType | GraphQLScalarType {
    const input = this.modelMeta.inputTypes.get(name)

    if (!input) throw new Error(`Input type ${name} not found`)

    if (input.fields.length === 0) return PrismaTypeFactory.emptyInputScalar()
    const existing = weaverContext.getNamedType(name) as
      | GraphQLObjectType
      | undefined

    if (existing) return existing

    const {
      fields: fieldsGetter,
      input: inputGetter,
      [SYMBOLS.WEAVER_CONFIG]: _,
      ...modelConfig
    } = weaverContext.getConfig<PrismaModelConfig<any>>(
      `gqloom.prisma.model.${input.meta?.grouping}`
    ) ?? {}

    const fieldsConfig =
      typeof fieldsGetter === "function" ? fieldsGetter() : fieldsGetter

    const inputBehaviors =
      typeof inputGetter === "function" ? inputGetter() : inputGetter

    const operation = PrismaTypeFactory.getOperationByName(name)

    return weaverContext.memoNamedType(
      new GraphQLObjectType({
        name,
        fields: provideWeaverContext.inherit(() => ({
          ...Object.fromEntries(
            input.fields
              .map((field) => {
                const opBehavior = PrismaTypeFactory.getOperationBehavior(
                  inputBehaviors,
                  field.name,
                  operation
                )

                if (opBehavior === false) return null

                const isNonNull = field.isRequired && !field.isNullable
                const fieldInput = PrismaTypeFactory.getMostRankInputType(
                  field.inputTypes
                )

                const finalFieldConfig =
                  opBehavior != null &&
                  (isSilk(opBehavior) || isOutputType(opBehavior))
                    ? opBehavior
                    : fieldInput.location === "scalar"
                      ? fieldsConfig?.[field.name]
                      : undefined

                const [typeGetter, options, source] =
                  PrismaWeaver.getFieldConfigOptions(finalFieldConfig)

                const isList = fieldInput.isList
                let type: GraphQLOutputType | typeof SYMBOLS.FIELD_HIDDEN =
                  (() => {
                    if (source != null) {
                      return PrismaWeaver.getGraphQLTypeByField(
                        fieldInput.type,
                        typeGetter,
                        null
                      )
                    }

                    switch (fieldInput.location) {
                      case "inputObjectTypes":
                        return this.inputType(fieldInput.type)
                      case "scalar": {
                        try {
                          return PrismaWeaver.getGraphQLTypeByField(
                            fieldInput.type,
                            typeGetter,
                            null
                          )
                        } catch (_err) {
                          throw new Error(
                            `Can not find GraphQL type for scalar ${fieldInput.type}`
                          )
                        }
                      }
                      case "enumTypes":
                        return this.enumType(fieldInput.type)
                      default:
                        throw new Error(
                          `Unknown input type location: ${fieldInput.location}`
                        )
                    }
                  })()

                if (type === SYMBOLS.FIELD_HIDDEN) return null

                if (isList && !isListType(type))
                  type = new GraphQLList(new GraphQLNonNull(type))
                if (isNonNull && !isNonNullType(type))
                  type = new GraphQLNonNull(type)

                return [
                  field.name,
                  {
                    description: field.comment,
                    deprecationReason: field.deprecation?.reason,
                    type,
                    ...options,
                  } as GraphQLFieldConfig<any, any, any>,
                ]
              })
              .filter((x) => x != null)
          ),
        })),
        ...modelConfig,
      })
    )
  }

  public enumType(name: string): GraphQLEnumType {
    const enumType = this.modelMeta.enumTypes.get(name)
    if (!enumType) {
      const enumModel = this.modelMeta.enums[name]
      if (!enumModel) throw new Error(`Enum type ${name} not found`)
      return PrismaWeaver.getGraphQLEnumType(enumModel)
    }

    const existing = weaverContext.getNamedType(name) as
      | GraphQLEnumType
      | undefined

    if (existing) return existing

    return weaverContext.memoNamedType(
      new GraphQLEnumType({
        name,
        values: Object.fromEntries(
          enumType.data.map((item) => [
            item.value,
            { value: item.value } as GraphQLEnumValueConfig,
          ])
        ),
      })
    )
  }

  protected static getOperationBehavior(
    behaviors: PrismaModelFieldBehaviors<any> | undefined,
    fieldName: string,
    operation: PrismaInputOperation
  ): boolean | GraphQLSilk | GraphQLOutputType | undefined {
    const fieldBehavior = behaviors?.[fieldName]
    const wildcardBehavior = behaviors?.["*"]

    const resolveBehavior = (
      b:
        | boolean
        | GraphQLSilk<any, any>
        | GraphQLOutputType
        | PrismaModelFieldBehavior<any>
        | undefined
    ) => {
      if (b === undefined) return undefined
      if (typeof b === "boolean") return b
      if (isSilk(b)) return b
      if (isOutputType(b)) return b
      return b[operation]
    }

    return resolveBehavior(fieldBehavior) ?? resolveBehavior(wildcardBehavior)
  }

  protected static emptyInputScalar(): GraphQLScalarType {
    const name = "EmptyInput"

    const existing = weaverContext.getNamedType(name) as
      | GraphQLScalarType
      | undefined
    if (existing) return existing

    return weaverContext.memoNamedType(
      new GraphQLScalarType({
        name,
        description: "Empty input scalar",
      })
    )
  }

  protected static getMostRankInputType(
    inputTypes: readonly DMMF.InputTypeRef[]
  ): DMMF.InputTypeRef {
    const rankList = inputTypes
      .map((item) => ({
        item,
        rank: PrismaTypeFactory.getInputTypeRank(item),
      }))
      .sort((a, b) => b.rank - a.rank)

    return rankList[0].item
  }

  protected static getInputTypeRank(inputType: DMMF.InputTypeRef): number {
    let rank = inputType.type.length
    if (inputType.isList) rank += 10
    if (inputType.type.includes("Unchecked")) rank -= 50
    if (inputType.type === "Null") rank -= Infinity
    switch (inputType.location) {
      case "scalar":
        rank += 10
        break
      case "enumTypes":
        rank += 20
        break
      case "fieldRefTypes":
        rank -= 30
        break
      case "inputObjectTypes":
        rank += 40
    }
    return rank
  }

  protected static indexModelMeta(
    modelMeta: PrismaModelMeta
  ): Required<PrismaModelMeta> {
    modelMeta.inputTypes ??= PrismaTypeFactory.indexInputTypes(modelMeta.schema)
    modelMeta.enumTypes ??= PrismaTypeFactory.indexEnumTypes(modelMeta.schema)
    return modelMeta as Required<PrismaModelMeta>
  }

  protected static indexInputTypes(
    schema: DMMF.Schema
  ): Map<string, DMMF.InputType> {
    const map = new Map<string, DMMF.InputType>()
    for (const inputType of schema.inputObjectTypes.prisma ?? []) {
      map.set(inputType.name, inputType)
    }
    return map
  }

  protected static indexEnumTypes(
    schema: DMMF.Schema
  ): Map<string, DMMF.SchemaEnum> {
    const map = new Map<string, DMMF.SchemaEnum>()
    for (const enumType of schema.enumTypes.prisma ?? []) {
      // Convert from old format { name, values: string[] } to new format { name, data: { key, value }[] }
      const convertedEnum: DMMF.SchemaEnum = {
        name: enumType.name,
        data:
          (enumType as any).data ??
          (enumType as any).values?.map((value: string) => ({
            key: value,
            value: value,
          })) ??
          [],
      }
      map.set(enumType.name, convertedEnum)
    }
    return map
  }
}

export class PrismaActionArgsFactory<
  TModelSilk extends AnyPrismaModelSilk = AnyPrismaModelSilk,
> extends PrismaTypeFactory<TModelSilk> {
  /**
   * Cached field validators populated when input types are built during weave (weaverContext is set).
   * Used at resolve time so validation works without relying on weaverContext.
   */
  protected validatorsCache?: Map<
    "create" | "update",
    Map<string, GraphQLSilk<any, any>>
  >

  public constructor(protected readonly silk: TModelSilk) {
    super(silk.meta)
  }

  public inputType(name: string): GraphQLObjectType | GraphQLScalarType {
    const operation = PrismaTypeFactory.getOperationByName(name)
    if (operation === "create" || operation === "update") {
      if (!this.validatorsCache) this.validatorsCache = new Map()
      if (!this.validatorsCache.has(operation)) {
        this.validatorsCache.set(operation, this.getFieldValidators(operation))
      }
    }
    return super.inputType(name)
  }

  /**
   * Build a map of field validators for the given operation from Model.config({ input: { ... } })
   */
  protected getFieldValidators(
    operation: "create" | "update"
  ): Map<string, GraphQLSilk<any, any>> {
    const validators = new Map<string, GraphQLSilk<any, any>>()
    const model = this.silk.model
    const inputTypeName =
      operation === "create"
        ? `${model.name}CreateInput`
        : `${model.name}UpdateInput`
    const input = this.modelMeta.inputTypes.get(inputTypeName)
    if (!input) return validators

    const config = weaverContext.getConfig<PrismaModelConfig<any>>(
      `gqloom.prisma.model.${model.name}`
    )
    const inputGetter = config?.input
    const inputBehaviors =
      typeof inputGetter === "function" ? inputGetter() : inputGetter

    for (const field of input.fields) {
      const opBehavior = PrismaTypeFactory.getOperationBehavior(
        inputBehaviors,
        field.name,
        operation
      )
      const hasValidate =
        opBehavior != null &&
        typeof opBehavior === "object" &&
        "~standard" in opBehavior &&
        typeof (opBehavior as any)["~standard"]?.validate === "function"
      if (hasValidate) {
        validators.set(field.name, opBehavior as GraphQLSilk<any, any>)
      }
    }
    return validators
  }

  /**
   * Validate fields using the provided validators (parallel validation)
   */
  protected async validateFields(
    data: any,
    fieldValidators: Map<string, GraphQLSilk<any, any>>
  ): Promise<StandardSchemaV1.Result<any>> {
    const result: Record<string, any> = {}
    const issues: StandardSchemaV1.Issue[] = []

    const validationPromises = Array.from(fieldValidators.entries())
      .filter(([fieldName]) => fieldName in data)
      .map(async ([fieldName, validator]) => {
        const fieldValue = data[fieldName]
        const validationResult = await (validator as any)["~standard"].validate(
          fieldValue
        )
        return { fieldName, validationResult }
      })

    const validationResults = await Promise.all(validationPromises)

    for (const { fieldName, validationResult } of validationResults) {
      if (validationResult.issues) {
        issues.push(
          ...validationResult.issues.map((issue: StandardSchemaV1.Issue) => ({
            ...issue,
            path: [fieldName, ...(issue.path || [])],
          }))
        )
      } else if ("value" in validationResult) {
        result[fieldName] = validationResult.value
      }
    }

    for (const key in data) {
      if (!fieldValidators.has(key) && data[key] !== undefined) {
        result[key] = data[key]
      }
    }

    return issues.length > 0 ? { issues } : { value: result }
  }

  /**
   * Compile a validator for create/update args. Uses cached validators when available (set during schema build).
   */
  protected compileDataValidator(
    operation: "create" | "update",
    transform: (validatedData: any, args: { data: any }) => { data: any }
  ): (args: { data: any }) => Promise<StandardSchemaV1.Result<{ data: any }>> {
    return async (args: { data: any }) => {
      const fieldValidators =
        this.validatorsCache?.get(operation) ??
        this.getFieldValidators(operation)
      if (fieldValidators.size === 0) {
        return { value: transform(args.data, args) }
      }

      const dataResult = await this.validateFields(args.data, fieldValidators)

      if (dataResult.issues) {
        return { issues: dataResult.issues }
      }

      return { value: transform(dataResult.value, args) }
    }
  }

  /**
   * Create a silk for create mutation args that runs field validators from Model.config({ input })
   */
  public createArgsSilk(): GraphQLSilk<{ data: any }, { data: any }> {
    return silk(
      () => gt.nonNull(this.createArgs()),
      this.compileDataValidator("create", (data) => ({ data }))
    )
  }

  protected getModel(modelOrName?: string | DMMF.Model): DMMF.Model {
    if (modelOrName == null) return this.silk.model
    if (typeof modelOrName === "object") return modelOrName
    const model = this.silk.meta.models[modelOrName]
    if (model == null) throw new Error(`Model ${modelOrName} not found`)
    return model
  }

  public countArgs(modelName?: string | DMMF.Model): GraphQLObjectType {
    const model = this.getModel(modelName)
    const name = `${model.name}CountArgs`

    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const input: GraphQLObjectType = new GraphQLObjectType({
      name,
      fields: provideWeaverContext.inherit(() => ({
        where: { type: this.inputType(`${model.name}WhereInput`) },
        orderBy: {
          type: gt.list(
            this.inputType(`${model.name}OrderByWithRelationInput`)
          ),
        },
        cursor: { type: this.inputType(`${model.name}WhereUniqueInput`) },
        skip: { type: gt.int },
        take: { type: gt.int },
      })),
    })

    return weaverContext.memoNamedType(input)
  }

  public findFirstArgs(modelName?: string | DMMF.Model): GraphQLObjectType {
    const model = this.getModel(modelName)
    const name = `${model.name}FindFirstArgs`

    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const input: GraphQLObjectType = new GraphQLObjectType({
      name,
      fields: provideWeaverContext.inherit(() => ({
        where: { type: this.inputType(`${model.name}WhereInput`) },
        orderBy: {
          type: gt.list(
            this.inputType(`${model.name}OrderByWithRelationInput`)
          ),
        },
        cursor: { type: this.inputType(`${model.name}WhereUniqueInput`) },
        skip: { type: gt.int },
        take: { type: gt.int },
        distinct: {
          type: gt.list(this.enumType(`${model.name}ScalarFieldEnum`)),
        },
      })),
    })

    return weaverContext.memoNamedType(input)
  }

  public findManyArgs(modelName?: string | DMMF.Model): GraphQLObjectType {
    const model = this.getModel(modelName)
    const name = `${model.name}FindManyArgs`

    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const input: GraphQLObjectType = new GraphQLObjectType({
      name,
      fields: provideWeaverContext.inherit(() => ({
        where: { type: this.inputType(`${model.name}WhereInput`) },
        orderBy: {
          type: gt.list(
            this.inputType(`${model.name}OrderByWithRelationInput`)
          ),
        },
        cursor: { type: this.inputType(`${model.name}WhereUniqueInput`) },
        skip: { type: gt.int },
        take: { type: gt.int },
        distinct: {
          type: gt.list(this.enumType(`${model.name}ScalarFieldEnum`)),
        },
      })),
    })

    return weaverContext.memoNamedType(input)
  }

  public findUniqueArgs(modelName?: string | DMMF.Model): GraphQLObjectType {
    const model = this.getModel(modelName)
    const name = `${model.name}FindUniqueArgs`

    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const input: GraphQLObjectType = new GraphQLObjectType({
      name,
      fields: provideWeaverContext.inherit(() => ({
        where: { type: this.inputType(`${model.name}WhereUniqueInput`) },
      })),
    })

    return weaverContext.memoNamedType(input)
  }

  public createArgs(modelName?: string | DMMF.Model): GraphQLObjectType {
    const model = this.getModel(modelName)
    const name = `${model.name}CreateArgs`

    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const input: GraphQLObjectType = new GraphQLObjectType({
      name,
      fields: provideWeaverContext.inherit(() => ({
        data: {
          type: gt.nonNull(this.inputType(`${model.name}CreateInput`)),
        },
      })),
    })
    return weaverContext.memoNamedType(input)
  }

  public createManyArgs(modelName?: string | DMMF.Model): GraphQLObjectType {
    const model = this.getModel(modelName)
    const name = `${model.name}CreateManyArgs`

    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const input: GraphQLObjectType = new GraphQLObjectType({
      name,
      fields: provideWeaverContext.inherit(() => ({
        data: {
          type: gt.nonNull(
            gt.list(this.inputType(`${model.name}CreateManyInput`))
          ),
        },
      })),
    })
    return weaverContext.memoNamedType(input)
  }

  public deleteArgs(modelName?: string | DMMF.Model): GraphQLObjectType {
    const model = this.getModel(modelName)
    const name = `${model.name}DeleteArgs`

    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const input: GraphQLObjectType = new GraphQLObjectType({
      name,
      fields: provideWeaverContext.inherit(() => ({
        where: {
          type: gt.nonNull(this.inputType(`${model.name}WhereUniqueInput`)),
        },
      })),
    })

    return weaverContext.memoNamedType(input)
  }

  public deleteManyArgs(modelName?: string | DMMF.Model): GraphQLObjectType {
    const model = this.getModel(modelName)
    const name = `${model.name}DeleteManyArgs`

    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const input: GraphQLObjectType = new GraphQLObjectType({
      name,
      fields: provideWeaverContext.inherit(() => ({
        where: { type: this.inputType(`${model.name}WhereInput`) },
      })),
    })

    return weaverContext.memoNamedType(input)
  }

  public updateArgs(modelName?: string | DMMF.Model): GraphQLObjectType {
    const model = this.getModel(modelName)
    const name = `${model.name}UpdateArgs`

    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const input: GraphQLObjectType = new GraphQLObjectType({
      name,
      fields: provideWeaverContext.inherit(() => ({
        data: {
          type: gt.nonNull(this.inputType(`${model.name}UpdateInput`)),
        },
        where: {
          type: gt.nonNull(this.inputType(`${model.name}WhereUniqueInput`)),
        },
      })),
    })
    return weaverContext.memoNamedType(input)
  }

  public updateManyArgs(modelName?: string | DMMF.Model): GraphQLObjectType {
    const model = this.getModel(modelName)
    const name = `${model.name}UpdateManyArgs`

    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const input: GraphQLObjectType = new GraphQLObjectType({
      name,
      fields: provideWeaverContext.inherit(() => ({
        data: {
          type: gt.nonNull(
            this.inputType(`${model.name}UpdateManyMutationInput`)
          ),
        },
        where: { type: this.inputType(`${model.name}WhereInput`) },
      })),
    })

    return weaverContext.memoNamedType(input)
  }

  public upsertArgs(modelName?: string | DMMF.Model): GraphQLObjectType {
    const model = this.getModel(modelName)
    const name = `${model.name}UpsertArgs`

    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const input: GraphQLObjectType = new GraphQLObjectType({
      name,
      fields: provideWeaverContext.inherit(() => ({
        where: {
          type: gt.nonNull(this.inputType(`${model.name}WhereUniqueInput`)),
        },
        create: {
          type: gt.nonNull(this.inputType(`${model.name}CreateInput`)),
        },
        update: {
          type: gt.nonNull(this.inputType(`${model.name}UpdateInput`)),
        },
      })),
    })
    return weaverContext.memoNamedType(input)
  }

  public static batchPayload(): GraphQLObjectType {
    const name = "BatchPayload"
    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType
    const input: GraphQLObjectType = new GraphQLObjectType({
      name,
      fields: provideWeaverContext.inherit(() => ({
        count: { type: gt.nonNull(gt.int) },
      })),
    })

    return weaverContext.memoNamedType(input)
  }
}

/**
 * @deprecated Use PrismaTypeFactory instead
 */
export const PrismaTypeWeaver = PrismaTypeFactory

/**
 * @deprecated Use PrismaActionArgsFactory instead
 */
export const PrismaActionArgsWeaver = PrismaActionArgsFactory
