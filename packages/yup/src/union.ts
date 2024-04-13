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
  public schemas: ReadonlyArray<Schema>

  constructor(schemas: ReadonlyArray<Schema>) {
    super({
      spec: { schemas } as any,
      type: "union",
      check(value): value is NonNullable<TType> {
        return schemas.some((schema) => schema.isType(value))
      },
    })
    this.schemas = schemas

    this.test({
      name: "not nil",
      test(value) {
        console.log(value)
        return value == null
      },
    })

    this.cast = (value, options: any) => {
      const targetSchema = this.findTargetSchemaSync(value)
      if (targetSchema) return targetSchema.cast(value, options)
      return super.cast(value, options)
    }

    this.validate = async (value, options) => {
      const targetSchema = await this.findTargetSchema(value)
      if (targetSchema) return targetSchema.validate(value, options)
      if (this.validateNil(value)) return value
      throw new ValidationError("Union validation failed", value)
    }

    this.validateSync = (value, options) => {
      const targetSchema = this.findTargetSchemaSync(value)
      if (targetSchema) return targetSchema.validateSync(value, options)
      if (this.validateNil(value)) return value
      throw new ValidationError("Union validation failed", value)
    }
    this.describe = (options) => {
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
  }

  validateNil(value: any) {
    if (value === null && this.spec.nullable) return true
    if (value === undefined && this.spec.optional) return true
    return false
  }

  async findTargetSchema(value: any): Promise<Schema | undefined> {
    for (const schema of this.schemas) {
      if (await schema.isValid(value, { strict: true })) return schema
    }
  }

  findTargetSchemaSync(value: any): Schema | undefined {
    for (const schema of this.schemas) {
      if (schema.isValidSync(value, { strict: true })) return schema
    }
  }
}

export interface IUnionSchema<
  TType = any,
  TContext = AnyObject,
  TDefault = undefined,
  TFlags extends Flags = "",
> extends Schema<TType, TContext, TDefault, TFlags> {
  schemas: ReadonlyArray<Schema>

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
