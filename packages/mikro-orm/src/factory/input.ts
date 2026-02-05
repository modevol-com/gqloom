import {
  type GraphQLSilk,
  isSilk,
  mapValue,
  pascalCase,
  provideWeaverContext,
  type StandardSchemaV1,
  silk,
  weaverContext,
} from "@gqloom/core"
import {
  type EntityMetadata,
  type EntityName,
  type EntityProperty,
  type FilterQuery,
  QueryOrder,
  ReferenceKind,
} from "@mikro-orm/core"
import {
  GraphQLEnumType,
  type GraphQLFieldConfig,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLString,
  isNonNullType,
} from "graphql"
import { MikroWeaver } from ".."
import { getMetadata } from "../helper"
import type {
  CollectionFieldArgs,
  CollectionFieldOptions,
  CountQueryArgs,
  CountQueryOptions,
  CreateMutationArgs,
  CreateMutationOptions,
  DeleteMutationArgs,
  DeleteMutationOptions,
  FilterArgs,
  FindByCursorQueryArgs,
  FindByCursorQueryOptions,
  FindOneQueryArgs,
  FindOneQueryOptions,
  FindQueryArgs,
  FindQueryOptions,
  InsertManyMutationArgs,
  InsertManyMutationOptions,
  InsertMutationArgs,
  InsertMutationOptions,
  MikroFactoryPropertyBehaviors,
  MikroResolverFactoryOptions,
  UpdateMutationArgs,
  UpdateMutationOptions,
  UpsertManyMutationArgs,
  UpsertManyMutationOptions,
  UpsertMutationArgs,
  UpsertMutationOptions,
} from "./type"

export class MikroInputFactory<TEntity extends object> {
  public constructor(
    protected readonly entityName: EntityName<TEntity>,
    protected readonly options?: Partial<MikroResolverFactoryOptions<TEntity>>
  ) {}

  protected get meta(): EntityMetadata {
    return getMetadata(this.entityName, this.options?.metadata)
  }

  protected get metaName(): string {
    return this.meta.name ?? this.meta.className
  }

  public collectionFieldArgs(targetEntity: EntityMetadata<any>) {
    const name = `${targetEntity.name ?? targetEntity.className}CollectionFieldArgs`
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing
    return weaverContext.memoNamedType(
      new GraphQLObjectType({
        name,
        fields: () => ({
          where: { type: this.filter(targetEntity) },
        }),
      })
    )
  }

  public collectionFieldArgsSilk(targetEntity: EntityMetadata<any>) {
    return silk<
      CollectionFieldOptions<any, any>,
      CollectionFieldArgs<any, any>
    >(
      () => this.collectionFieldArgs(targetEntity),
      (args) => ({
        value: { where: MikroInputFactory.transformFilters(args.where) },
      })
    )
  }

  public filter(meta?: EntityMetadata<any>): GraphQLObjectType {
    meta ??= this.meta
    const name = `${meta.name ?? meta.className}Filter`

    return (
      weaverContext.getNamedType(name) ??
      weaverContext.memoNamedType(
        new GraphQLObjectType({
          name,
          fields: () => ({
            // Entity property fields
            ...mapValue(meta.properties, (property, propertyName) => {
              // Check visibility for filters
              if (
                !MikroInputFactory.isPropertyVisible(
                  propertyName,
                  meta === this.meta ? this.options?.input : undefined,
                  "filters"
                )
              ) {
                return mapValue.SKIP
              }

              const type = MikroWeaver.getFieldType(property, meta)
              if (type == null) return mapValue.SKIP
              return {
                type:
                  type instanceof GraphQLScalarType
                    ? MikroInputFactory.comparisonOperatorsType(type)
                    : type,
                description: property.comment,
              } as GraphQLFieldConfig<any, any>
            }),

            // Logical operators
            AND: {
              type: new GraphQLList(new GraphQLNonNull(this.filter(meta))),
              description:
                "Joins query clauses with a logical AND returns all documents that match the conditions of both clauses.",
            },
            OR: {
              type: new GraphQLList(new GraphQLNonNull(this.filter(meta))),
              description:
                "Joins query clauses with a logical OR returns all documents that match the conditions of either clause.",
            },
            NOT: {
              type: this.filter(meta),
              description:
                "Inverts the effect of a query expression and returns documents that do not match the query expression.",
            },
          }),
        })
      )
    )
  }

  public countArgs() {
    const name = `${pascalCase(this.metaName)}CountArgs`
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing
    return weaverContext.memoNamedType(
      new GraphQLObjectType<CountQueryArgs<TEntity>>({
        name,
        fields: {
          where: { type: this.filter() },
        },
      })
    )
  }

  public countArgsSilk() {
    return silk<CountQueryOptions<TEntity>, CountQueryArgs<TEntity>>(
      () => this.countArgs(),
      (args) => ({
        value: {
          where: MikroInputFactory.transformFilters(args.where),
        },
      })
    )
  }

  public findArgs() {
    const name = `${pascalCase(this.metaName)}FindArgs`
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing
    return weaverContext.memoNamedType(
      new GraphQLObjectType<FindQueryArgs<TEntity>>({
        name,
        fields: {
          where: { type: this.filter() },
          orderBy: { type: this.orderBy() },
          limit: { type: GraphQLInt },
          offset: { type: GraphQLInt },
        },
      })
    )
  }

  public findArgsSilk() {
    return silk<FindQueryOptions<TEntity>, FindQueryArgs<TEntity>>(
      () => this.findArgs(),
      (args) => ({
        value: {
          where: MikroInputFactory.transformFilters(args.where),
          orderBy: args.orderBy,
          limit: args.limit,
          offset: args.offset,
        },
      })
    )
  }

  public findByCursorArgs() {
    const name = `${pascalCase(this.metaName)}FindByCursorArgs`
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing
    return weaverContext.memoNamedType(
      new GraphQLObjectType<FindByCursorQueryArgs<TEntity>>({
        name,
        fields: {
          where: { type: this.filter() },
          orderBy: { type: this.orderBy() },
          after: { type: GraphQLString },
          before: { type: GraphQLString },
          first: { type: GraphQLInt },
          last: { type: GraphQLInt },
        },
      })
    )
  }

  public findByCursorArgsSilk() {
    return silk<
      FindByCursorQueryOptions<TEntity>,
      FindByCursorQueryArgs<TEntity>
    >(
      () => this.findByCursorArgs(),
      (args) => ({
        value: {
          where: MikroInputFactory.transformFilters(args.where),
          orderBy: args.orderBy,
          after: args.after,
          before: args.before,
          first: args.first,
          last: args.last,
        },
      })
    )
  }

  public findOneArgs() {
    const name = `${pascalCase(this.metaName)}FindOneArgs`
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing
    return weaverContext.memoNamedType(
      new GraphQLObjectType<FindOneQueryArgs<TEntity>>({
        name,
        fields: {
          where: { type: new GraphQLNonNull(this.filter()) },
          orderBy: { type: this.orderBy() },
          offset: { type: GraphQLInt },
        },
      })
    )
  }

  public findOneArgsSilk() {
    return silk<FindOneQueryOptions<TEntity>, FindOneQueryArgs<TEntity>>(
      () => this.findOneArgs(),
      (args) => ({
        value: {
          where: MikroInputFactory.transformFilters(args.where),
          orderBy: args.orderBy,
          offset: args.offset,
        },
      })
    )
  }

  public createArgs() {
    const name = `${this.metaName}CreateArgs`
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing
    return weaverContext.memoNamedType(
      new GraphQLObjectType<CreateMutationArgs<TEntity>>({
        name,
        fields: {
          data: { type: new GraphQLNonNull(this.requiredInput()) },
        },
      })
    )
  }

  public createArgsSilk() {
    return silk<CreateMutationOptions<TEntity>, CreateMutationArgs<TEntity>>(
      () => this.createArgs(),
      this.compileDataValidator<
        CreateMutationArgs<TEntity>,
        CreateMutationOptions<TEntity>
      >("create", (data) => ({ data }))
    )
  }

  public insertArgs() {
    const name = `${this.metaName}InsertArgs`
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing
    return weaverContext.memoNamedType(
      new GraphQLObjectType<InsertMutationArgs<TEntity>>({
        name,
        fields: {
          data: { type: new GraphQLNonNull(this.requiredInput()) },
        },
      })
    )
  }

  public insertArgsSilk() {
    return silk<InsertMutationOptions<TEntity>, InsertMutationArgs<TEntity>>(
      () => this.insertArgs(),
      this.compileDataValidator<
        InsertMutationArgs<TEntity>,
        InsertMutationOptions<TEntity>
      >("create", (data) => ({ data }))
    )
  }

  public insertManyArgs() {
    const name = `${this.metaName}InsertManyArgs`
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing
    return weaverContext.memoNamedType(
      new GraphQLObjectType<InsertManyMutationArgs<TEntity>>({
        name,
        fields: {
          data: {
            type: new GraphQLNonNull(new GraphQLList(this.requiredInput())),
          },
        },
      })
    )
  }

  public insertManyArgsSilk() {
    return silk<
      InsertManyMutationOptions<TEntity>,
      InsertManyMutationArgs<TEntity>
    >(
      () => this.insertManyArgs(),
      this.compileArrayDataValidator<
        InsertManyMutationArgs<TEntity>,
        InsertManyMutationOptions<TEntity>
      >("create", (data) => ({ data }))
    )
  }

  public deleteArgs() {
    const name = `${this.metaName}DeleteArgs`
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing
    return weaverContext.memoNamedType(
      new GraphQLObjectType<DeleteMutationArgs<TEntity>>({
        name,
        fields: {
          where: { type: this.filter() },
        },
      })
    )
  }

  public deleteArgsSilk() {
    return silk<DeleteMutationOptions<TEntity>, DeleteMutationArgs<TEntity>>(
      () => this.deleteArgs(),
      (args) => ({
        value: { where: MikroInputFactory.transformFilters(args.where) },
      })
    )
  }

  public updateArgs() {
    const name = `${this.metaName}UpdateArgs`
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing
    return weaverContext.memoNamedType(
      new GraphQLObjectType<UpdateMutationArgs<TEntity>>({
        name,
        fields: {
          where: { type: this.filter() },
          data: { type: new GraphQLNonNull(this.partialInput()) },
        },
      })
    )
  }

  public updateArgsSilk() {
    return silk<UpdateMutationOptions<TEntity>, UpdateMutationArgs<TEntity>>(
      () => this.updateArgs(),
      this.compileDataValidator<
        UpdateMutationArgs<TEntity>,
        UpdateMutationOptions<TEntity>
      >("update", (data, args) => ({
        where: MikroInputFactory.transformFilters(args.where),
        data,
      }))
    )
  }

  public upsertArgs() {
    const name = `${this.metaName}UpsertArgs`
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing
    return weaverContext.memoNamedType(
      new GraphQLObjectType<UpsertMutationArgs<TEntity>>({
        name,
        fields: {
          data: { type: new GraphQLNonNull(this.partialInput()) },
          onConflictAction: { type: MikroInputFactory.onConflictActionType() },
          onConflictExcludeFields: {
            type: new GraphQLList(new GraphQLNonNull(GraphQLString)),
          },
          onConflictFields: {
            type: new GraphQLList(new GraphQLNonNull(GraphQLString)),
          },
          onConflictMergeFields: {
            type: new GraphQLList(new GraphQLNonNull(GraphQLString)),
          },
        },
      })
    )
  }

  public upsertArgsSilk() {
    return silk<UpsertMutationOptions<TEntity>, UpsertMutationArgs<TEntity>>(
      () => this.upsertArgs(),
      this.compileDataValidator<
        UpsertMutationArgs<TEntity>,
        UpsertMutationOptions<TEntity>
      >("update", (data, args) => ({ ...args, data }))
    )
  }

  public upsertManyArgs() {
    const name = `${this.metaName}UpsertManyArgs`
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing
    return weaverContext.memoNamedType(
      new GraphQLObjectType<UpsertManyMutationArgs<TEntity>>({
        name,
        fields: {
          data: {
            type: new GraphQLNonNull(
              new GraphQLList(new GraphQLNonNull(this.partialInput()))
            ),
          },
          onConflictAction: { type: MikroInputFactory.onConflictActionType() },
          onConflictExcludeFields: {
            type: new GraphQLList(new GraphQLNonNull(GraphQLString)),
          },
          onConflictFields: {
            type: new GraphQLList(new GraphQLNonNull(GraphQLString)),
          },
          onConflictMergeFields: {
            type: new GraphQLList(new GraphQLNonNull(GraphQLString)),
          },
        },
      })
    )
  }

  public upsertManyArgsSilk() {
    return silk<
      UpsertManyMutationOptions<TEntity>,
      UpsertManyMutationArgs<TEntity>
    >(
      () => this.upsertManyArgs(),
      this.compileArrayDataValidator<
        UpsertManyMutationArgs<TEntity>,
        UpsertManyMutationOptions<TEntity>
      >("update", (data, args) => ({ ...args, data }))
    )
  }

  public orderBy(): GraphQLObjectType {
    const name = `${this.metaName}OrderBy`
    return (
      weaverContext.getNamedType(name) ??
      weaverContext.memoNamedType(
        new GraphQLObjectType({
          name,
          fields: () =>
            mapValue(this.meta.properties, (property, propertyName) => {
              // Check visibility for filters (ordering is typically tied to filtering)
              if (
                !MikroInputFactory.isPropertyVisible(
                  propertyName,
                  this.options?.input,
                  "filters"
                )
              ) {
                return mapValue.SKIP
              }

              const type = MikroWeaver.getFieldType(property, this.meta)
              if (type == null) return mapValue.SKIP
              return {
                type: MikroInputFactory.queryOrderType(),
                description: property.comment,
              } as GraphQLFieldConfig<any, any>
            }),
        })
      )
    )
  }

  public requiredInput(): GraphQLObjectType {
    const name = `${this.metaName}RequiredInput`
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing
    return weaverContext.memoNamedType(
      new GraphQLObjectType({
        name,
        fields: provideWeaverContext.inherit(() =>
          mapValue(this.meta.properties, (property, propertyName) => {
            // Check visibility
            if (
              !MikroInputFactory.isPropertyVisible(
                propertyName,
                this.options?.input,
                "create"
              )
            ) {
              return mapValue.SKIP
            }

            // Get custom type if configured
            const customSilk = MikroInputFactory.getPropertyConfig(
              this.options?.input,
              propertyName as keyof TEntity,
              "create"
            )
            const type = customSilk
              ? silk.getType(customSilk)
              : (MikroWeaver.getFieldType(property, this.meta) ??
                MikroInputFactory.relationPropertyAsId(property))

            if (type == null) return mapValue.SKIP

            // Handle required fields - in MikroORM, nullable defaults to false for non-optional fields
            const isRequired =
              property.nullable !== true &&
              property.default === undefined &&
              !property.primary &&
              !property.onCreate &&
              property.kind !== ReferenceKind.MANY_TO_MANY &&
              property.kind !== ReferenceKind.ONE_TO_MANY

            const finalType =
              isRequired && !isNonNullType(type)
                ? new GraphQLNonNull(type)
                : type

            return {
              type: finalType,
              description: property.comment,
            } as GraphQLFieldConfig<any, any>
          })
        ),
      })
    )
  }

  public partialInput(): GraphQLObjectType {
    const name = `${this.metaName}PartialInput`
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing

    return weaverContext.memoNamedType(
      new GraphQLObjectType({
        name,
        fields: provideWeaverContext.inherit(() =>
          mapValue(this.meta.properties, (property, propertyName) => {
            // Check visibility
            if (
              !MikroInputFactory.isPropertyVisible(
                propertyName,
                this.options?.input,
                "update"
              )
            ) {
              return mapValue.SKIP
            }

            // Get custom type if configured
            const customSilk = MikroInputFactory.getPropertyConfig(
              this.options?.input,
              propertyName as keyof TEntity,
              "update"
            )
            const type = customSilk
              ? silk.getType(customSilk)
              : (MikroWeaver.getFieldType(property, this.meta) ??
                MikroInputFactory.relationPropertyAsId(property))

            if (type == null) return mapValue.SKIP

            // For update operations, make all fields optional except primary keys
            let finalType = type
            if (
              isNonNullType(type) &&
              !this.meta.primaryKeys.includes(propertyName)
            ) {
              finalType = type.ofType
            }

            return {
              type: finalType,
              description: property.comment,
            } as GraphQLFieldConfig<any, any>
          })
        ),
      })
    )
  }

  protected static relationPropertyAsId(property: EntityProperty<any, any>) {
    if (
      property.kind === ReferenceKind.MANY_TO_ONE ||
      property.kind === ReferenceKind.ONE_TO_ONE
    ) {
      return GraphQLID
    }

    if (
      property.kind === ReferenceKind.ONE_TO_MANY ||
      property.kind === ReferenceKind.MANY_TO_MANY
    ) {
      return new GraphQLList(GraphQLID)
    }
  }

  public static transformFilters<TEntity extends object>(
    args: FilterArgs<TEntity>
  ): FilterQuery<TEntity>
  public static transformFilters<TEntity extends object>(
    args: FilterArgs<TEntity> | undefined
  ): FilterQuery<TEntity> | undefined
  public static transformFilters(
    args: FilterArgs<any> | undefined
  ): FilterQuery<any> | undefined {
    if (!args) return
    const filters: FilterQuery<any> = {}
    for (const key in args) {
      const newKey = key.startsWith("$")
        ? key
        : key === "AND"
          ? "$and"
          : key === "OR"
            ? "$or"
            : key === "NOT"
              ? "$not"
              : key
      const value = (args as any)[key]
      if (Array.isArray(value)) {
        ;(filters as any)[newKey] = value.map((v) => this.transformFilters(v))
      } else if (typeof value === "object" && value !== null) {
        // Handle NOT operator recursively
        if (key === "NOT") {
          ;(filters as any)[newKey] = this.transformFilters(value)
        } else {
          const subQuery: any = {}
          for (const op in value) {
            subQuery[`$${op}`] = value[op]
          }
          ;(filters as any)[newKey] = subQuery
        }
      } else {
        ;(filters as any)[newKey] = value
      }
    }

    const { $and, $or, $not, ...where } = filters as any
    const result: FilterQuery<any> = where
    if ($and) {
      ;(result as any).$and = $and
    }
    if ($or) {
      ;(result as any).$or = $or
    }
    if ($not) {
      ;(result as any).$not = $not
    }
    return result
  }

  public static comparisonOperatorsType<TScalarType extends GraphQLScalarType>(
    type: TScalarType
  ): GraphQLObjectType {
    // https://mikro-orm.io/docs/query-conditions#comparison
    const name = `${type.name}ComparisonOperators`

    return (
      weaverContext.getNamedType(name) ??
      weaverContext.memoNamedType(
        new GraphQLObjectType({
          name,
          fields: {
            eq: {
              type,
              description:
                "Equals. Matches values that are equal to a specified value.",
            },
            gt: {
              type,
              description:
                "Greater. Matches values that are greater than a specified value.",
            },
            gte: {
              type,
              description:
                "Greater or Equal. Matches values that are greater than or equal to a specified value.",
            },
            in: {
              type: new GraphQLList(new GraphQLNonNull(type)),
              description:
                "Contains, Contains, Matches any of the values specified in an array.",
            },
            lt: {
              type,
              description:
                "Lower, Matches values that are less than a specified value.",
            },
            lte: {
              type,
              description:
                "Lower or equal, Matches values that are less than or equal to a specified value.",
            },
            ne: {
              type,
              description:
                "Not equal. Matches all values that are not equal to a specified value.",
            },
            nin: {
              type: new GraphQLList(new GraphQLNonNull(type)),
              description:
                "Not contains. Matches none of the values specified in an array.",
            },
            overlap: {
              type: new GraphQLList(new GraphQLNonNull(type)),
              description: "&&",
            },
            contains: {
              type: new GraphQLList(new GraphQLNonNull(type)),
              description: "@>",
            },
            contained: {
              type: new GraphQLList(new GraphQLNonNull(type)),
              description: "<@",
            },
            ...(type === GraphQLString
              ? {
                  like: {
                    type,
                    description: "Like. Uses LIKE operator",
                  },
                  re: {
                    type,
                    description: "Regexp. Uses REGEXP operator",
                  },
                  fulltext: {
                    type,
                    description:
                      "Full text.	A driver specific full text search function.",
                  },
                  ilike: {
                    type,
                    description: "ilike",
                  },
                }
              : {}),
          },
        })
      )
    )
  }

  public static queryOrderType(): GraphQLEnumType {
    const name = `QueryOrder`

    return (
      weaverContext.getNamedType(name) ??
      weaverContext.memoNamedType(
        new GraphQLEnumType({
          name,
          values: {
            ASC: { value: QueryOrder.ASC },
            ASC_NULLS_LAST: { value: QueryOrder.ASC_NULLS_LAST },
            ASC_NULLS_FIRST: { value: QueryOrder.ASC_NULLS_FIRST },
            DESC: { value: QueryOrder.DESC },
            DESC_NULLS_LAST: { value: QueryOrder.DESC_NULLS_LAST },
            DESC_NULLS_FIRST: { value: QueryOrder.DESC_NULLS_FIRST },
          },
        })
      )
    )
  }

  public static onConflictActionType(): GraphQLEnumType {
    const name = `MikroOnConflictAction`
    return (
      weaverContext.getNamedType(name) ??
      weaverContext.memoNamedType(
        new GraphQLEnumType({
          name,
          values: {
            ignore: { value: "ignore" },
            merge: { value: "merge" },
          },
        })
      )
    )
  }

  public static isPropertyVisible(
    propertyName: string,
    behaviors: MikroFactoryPropertyBehaviors<any> | undefined,
    operation: "filters" | "create" | "update"
  ): boolean {
    if (!behaviors) return true

    const behavior = behaviors[propertyName]
    const defaultBehavior = behaviors["*"]

    // Direct boolean value
    if (typeof behavior === "boolean") return behavior

    // GraphQLSilk (has ~standard property)
    if (behavior && typeof behavior === "object" && "~standard" in behavior) {
      return true
    }

    // PropertyBehavior object
    if (typeof behavior === "object") {
      const operationConfig = behavior[operation]
      if (typeof operationConfig === "boolean") return operationConfig
      if (
        operationConfig &&
        typeof operationConfig === "object" &&
        "~standard" in operationConfig
      )
        return true
    }

    // Check default behavior
    if (typeof defaultBehavior === "boolean") return defaultBehavior

    if (typeof defaultBehavior === "object") {
      const operationConfig = defaultBehavior[operation]
      if (typeof operationConfig === "boolean") return operationConfig
    }

    return true
  }

  public static getPropertyConfig<TEntity>(
    behaviors: MikroFactoryPropertyBehaviors<TEntity> | undefined,
    propertyName: keyof TEntity,
    operation: "create" | "update"
  ): GraphQLSilk<any, any> | undefined {
    if (!behaviors) return undefined

    const behavior = behaviors[propertyName]

    // Direct GraphQLSilk
    if (behavior && typeof behavior === "object" && "~standard" in behavior) {
      return behavior as GraphQLSilk<any, any>
    }

    // PropertyBehavior object with operation-specific silk
    if (typeof behavior === "object") {
      const operationConfig = behavior[operation]
      if (
        operationConfig &&
        typeof operationConfig === "object" &&
        "~standard" in operationConfig
      ) {
        return operationConfig as GraphQLSilk<any, any>
      }
    }

    return undefined
  }

  /**
   * Build a map of field validators for the given operation
   */
  protected getFieldValidators(
    operation: "create" | "update"
  ): Map<string, GraphQLSilk<any, any>> {
    const validators = new Map<string, GraphQLSilk<any, any>>()

    for (const [propertyName] of Object.entries(this.meta.properties)) {
      const customSilk = MikroInputFactory.getPropertyConfig(
        this.options?.input,
        propertyName as keyof TEntity,
        operation
      )

      if (customSilk && isSilk(customSilk)) {
        validators.set(propertyName, customSilk)
      }
    }

    return validators
  }

  /**
   * Validate fields using the provided validators
   */
  protected async validateFields(
    data: any,
    fieldValidators: Map<string, GraphQLSilk<any, any>>
  ): Promise<StandardSchemaV1.Result<any>> {
    const result: Record<string, any> = {}
    const issues: StandardSchemaV1.Issue[] = []

    // Validate each field that has a custom validator
    for (const [fieldName, validator] of fieldValidators.entries()) {
      // For update operations, skip validation if field is not provided (undefined)
      if (!(fieldName in data)) {
        continue
      }
      const fieldValue = data?.[fieldName]

      const validationResult = await validator["~standard"].validate(fieldValue)

      if (validationResult.issues) {
        // Add field name to path for each issue
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

    // Preserve fields that don't have custom validators
    for (const key in data) {
      if (!fieldValidators.has(key) && data[key] !== undefined) {
        result[key] = data[key]
      }
    }

    return issues.length > 0 ? { issues } : { value: result }
  }

  /**
   * Compile a validator function with custom transform
   */
  protected compileDataValidator<
    TArgs extends { data: any },
    TOptions extends { data: any },
  >(
    operation: "create" | "update",
    transform: (validatedData: TArgs["data"], args: TArgs) => TOptions
  ): (args: TArgs) => Promise<StandardSchemaV1.Result<TOptions>> {
    const fieldValidators = this.getFieldValidators(operation)

    return async (args: TArgs) => {
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
   * Compile a validator function for array data with custom transform
   */
  protected compileArrayDataValidator<
    TArgs extends { data: any[] },
    TOptions extends { data: any[] },
  >(
    operation: "create" | "update",
    transform: (validatedData: TArgs["data"], args: TArgs) => TOptions
  ): (args: TArgs) => Promise<StandardSchemaV1.Result<TOptions>> {
    const fieldValidators = this.getFieldValidators(operation)

    return async (args: TArgs) => {
      if (fieldValidators.size === 0) {
        return { value: transform(args.data, args) }
      }

      const issues: StandardSchemaV1.Issue[] = []
      const validatedData: any[] = []

      for (let i = 0; i < args.data.length; i++) {
        const itemResult = await this.validateFields(
          args.data[i],
          fieldValidators
        )

        if (itemResult.issues) {
          // Add array index to path for each issue
          issues.push(
            ...itemResult.issues.map((issue: StandardSchemaV1.Issue) => ({
              ...issue,
              path: [i, ...(issue.path || [])],
            }))
          )
        } else if ("value" in itemResult) {
          validatedData.push(itemResult.value)
        }
      }

      if (issues.length > 0) {
        return { issues }
      }

      return { value: transform(validatedData, args) }
    }
  }
}
