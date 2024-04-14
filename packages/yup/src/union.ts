import {
  type Maybe,
  Schema,
  type AnyObject,
  type Flags,
  type InferType,
  type Message,
  type DefaultThunk,
  type ToggleDefault,
  type Defined,
  type UnsetFlag,
  type SetFlag,
  type NotNull,
  ValidationError,
  type SchemaInnerTypeDescription,
} from "yup"

export function union<
  TSchema extends Schema,
  TContext extends Maybe<AnyObject> = AnyObject,
>(
  schemas: ReadonlyArray<TSchema>
): IUnionSchema<InferType<TSchema> | undefined, TContext> {
  return new UnionSchema(schemas)
}

export class UnionSchema<
    TType = any,
    TContext = AnyObject,
    TDefault = undefined,
    TFlags extends Flags = "",
  >
  extends Schema<TType, TContext, TDefault, TFlags>
  implements IUnionSchema<TType, TContext, TDefault, TFlags>
{
  declare spec: UnionSchemaSpec

  constructor(schemas: ReadonlyArray<Schema>) {
    super({
      spec: { schemas } as any,
      type: "union",
      check(value): value is NonNullable<TType> {
        return schemas.some((schema) => schema.isType(value))
      },
    })
  }

  cast(value: any, options: any) {
    const targetSchema = this.findTargetSchemaSync(value)
    if (targetSchema) return targetSchema.cast(value, options) as any
    return super.cast(value, options) as any
  }

  async validate(...args: Parameters<Schema["validate"]>) {
    const [value, options] = args
    const targetSchema = await this.findTargetSchema(value)
    if (targetSchema) return targetSchema.validate(value, options)
    if (this.validateNil(value)) return value

    const maybeDefault = this.getDefault()
    if (maybeDefault) return maybeDefault
    throw new ValidationError("Union validation failed", value)
  }

  validateSync(...args: Parameters<Schema["validateSync"]>) {
    const [value, options] = args
    const targetSchema = this.findTargetSchemaSync(value)
    if (targetSchema) return targetSchema.validateSync(value, options)
    if (this.validateNil(value)) return value
    const maybeDefault = this.getDefault()
    if (maybeDefault) return maybeDefault
    throw new ValidationError("Union validation failed", value)
  }

  describe(...arg: Parameters<Schema["describe"]>) {
    const [options] = arg
    const next = (options ? this.resolve(options) : this).clone()
    const base = super.describe(options) as SchemaInnerTypeDescription
    base.innerType = (
      next.spec as unknown as { schemas: ReadonlyArray<Schema> }
    ).schemas.map((schema, index) => {
      let innerOptions = options
      if (innerOptions?.value) {
        innerOptions = {
          ...innerOptions,
          parent: innerOptions.value,
          value: innerOptions.value[index],
        }
      }
      return schema.describe(innerOptions)
    })
    return base
  }

  validateNil(value: any) {
    if (value === null && this.spec.nullable) return true
    if (value === undefined && this.spec.optional) return true
    return false
  }

  async findTargetSchema(value: any): Promise<Schema | undefined> {
    if (value == null) return
    for (const schema of this.spec.schemas) {
      if (await schema.isValid(value, { strict: true })) return schema
    }
  }

  findTargetSchemaSync(value: any): Schema | undefined {
    if (value == null) return
    for (const schema of this.spec.schemas) {
      if (schema.isValidSync(value, { strict: true })) return schema
    }
  }
}

type SchemaSpec = Schema<any>["spec"]

interface UnionSchemaSpec extends SchemaSpec {
  schemas: ReadonlyArray<Schema>
}

export interface IUnionSchema<
  TType = any,
  TContext = AnyObject,
  TDefault = undefined,
  TFlags extends Flags = "",
> extends Schema<TType, TContext, TDefault, TFlags> {
  spec: UnionSchemaSpec

  findTargetSchema(value: any): Promise<Schema | undefined>
  findTargetSchemaSync(value: any): Schema | undefined

  default<D extends Maybe<TType>>(
    def: DefaultThunk<D, TContext>
  ): IUnionSchema<TType, TContext, D, ToggleDefault<TFlags, D>>

  defined(
    msg?: Message
  ): IUnionSchema<Defined<TType>, TContext, TDefault, TFlags>
  optional(): IUnionSchema<TType | undefined, TContext, TDefault, TFlags>

  required(
    msg?: Message
  ): IUnionSchema<NonNullable<TType>, TContext, TDefault, TFlags>
  notRequired(): IUnionSchema<Maybe<TType>, TContext, TDefault, TFlags>

  nullable(
    msg?: Message
  ): IUnionSchema<TType | null, TContext, TDefault, TFlags>
  nonNullable(
    msg?: Message
  ): IUnionSchema<NotNull<TType>, TContext, TDefault, TFlags>

  strip(
    enabled: false
  ): IUnionSchema<TType, TContext, TDefault, UnsetFlag<TFlags, "s">>
  strip(
    enabled?: true
  ): IUnionSchema<TType, TContext, TDefault, SetFlag<TFlags, "s">>
}