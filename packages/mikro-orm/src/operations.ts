import {
  type GraphQLSilk,
  type FieldOrOperation,
  type Middleware,
  type GraphQLFieldOptions,
  getFieldOptions,
  createInputParser,
  applyMiddlewares,
  compose,
  type MayPromise,
  silk,
  weaverContext,
  type GenericFieldOrOperation,
} from "@gqloom/core"
import {
  type RequiredEntityData,
  type EntitySchema,
  type EntityManager,
  Utils,
  type PrimaryProperty,
} from "@mikro-orm/core"
import { type InferEntity } from "./types"
import { MikroWeaver } from "."

interface MikroOperationBobbinOptions {
  getEntityManager: () => MayPromise<EntityManager>
}

export class MikroOperationBobbin<
  TSchema extends EntitySchema<any, any> & GraphQLSilk,
> {
  readonly options: MikroOperationBobbinOptions
  constructor(
    public readonly entity: TSchema,
    optionsOrGetEntityManager:
      | MikroOperationBobbinOptions
      | MikroOperationBobbinOptions["getEntityManager"]
  ) {
    if (typeof optionsOrGetEntityManager === "function") {
      this.options = { getEntityManager: optionsOrGetEntityManager }
    } else {
      this.options = optionsOrGetEntityManager
    }

    this.flushMiddleware = async (next) => {
      const result = await next()
      const em = await this.useEm()
      await em.flush()
      return result
    }
  }

  flushMiddleware: Middleware

  useEm() {
    return this.options.getEntityManager()
  }

  CreateInput(): GraphQLSilk<
    RequiredEntityData<InferEntity<TSchema>>,
    RequiredEntityData<InferEntity<TSchema>>
  > {
    const name = `${this.entity.meta.name}CreateInput`

    const gqlType =
      weaverContext.objectMap?.get(name) ??
      MikroWeaver.getGraphQLType(this.entity, {
        partial: this.entity.meta.primaryKeys,
        name: `${this.entity.meta.name}CreateInput`,
      })

    return silk(gqlType, (value) => value)
  }

  /**
   * Create a `create` mutation for the given entity.
   */
  CreateMutation<
    TInput extends GraphQLSilk<
      RequiredEntityData<InferEntity<TSchema>>
    > = GraphQLSilk<
      RequiredEntityData<InferEntity<TSchema>>,
      RequiredEntityData<InferEntity<TSchema>>
    >,
  >({
    input = this.CreateInput() as TInput,
    ...options
  }: {
    input?: TInput
    middlewares?: Middleware<
      FieldOrOperation<undefined, TSchema, TInput, "mutation">
    >[]
  } & GraphQLFieldOptions = {}): FieldOrOperation<
    undefined,
    TSchema,
    TInput,
    "mutation"
  > {
    const entity = this.entity

    const middlewares = this.middlewaresWithFlush(options)

    return {
      ...getFieldOptions(options),
      input,
      output: entity,
      type: "mutation",
      resolve: async (inputValue, extraOptions) => {
        const parseInput = createInputParser(input, inputValue)
        return applyMiddlewares(
          compose(extraOptions?.middlewares, middlewares),
          async () => {
            const em = await this.useEm()
            const inputResult = await parseInput()
            const instance = em.create(entity, inputResult)
            em.persist(instance)
            return instance
          },
          { parseInput, parent: undefined, outputSilk: entity }
        )
      },
    }
  }

  UpdateInput(): GraphQLSilk<
    UpdateInput<InferEntity<TSchema>>,
    UpdateInput<InferEntity<TSchema>>
  > {
    const name = `${this.entity.meta.name}UpdateInput`
    const gqlType =
      weaverContext.objectMap?.get(name) ??
      weaverContext.memo(
        MikroWeaver.getGraphQLType(this.entity, {
          partial: true,
          required: this.entity.meta.primaryKeys,
          name,
        })
      )

    return silk(gqlType, (value) => value)
  }

  /**
   * Create a `update` mutation for the given entity.
   */
  UpdateMutation<
    TInput extends GraphQLSilk<UpdateInput<InferEntity<TSchema>>> = GraphQLSilk<
      UpdateInput<InferEntity<TSchema>>,
      UpdateInput<InferEntity<TSchema>>
    >,
  >({
    input = this.UpdateInput() as TInput,
    ...options
  }: {
    input?: TInput
    middlewares?: Middleware<
      FieldOrOperation<undefined, TSchema, TInput, "mutation">
    >[]
  } & GraphQLFieldOptions = {}): FieldOrOperation<
    undefined,
    TSchema,
    TInput,
    "mutation"
  > {
    const entity = this.entity

    const middlewares = this.middlewaresWithFlush(options)

    return {
      ...getFieldOptions(options),
      input,
      output: entity,
      type: "mutation",
      resolve: async (inputValue, extraOptions) => {
        const parseInput = createInputParser(input, inputValue)
        return applyMiddlewares(
          compose(extraOptions?.middlewares, middlewares),
          async () => {
            const em = await this.useEm()
            const inputResult = await parseInput()
            const pk = Utils.extractPK(inputResult, entity.meta)
            const instance = await em.findOne(entity, pk)
            if (instance == null) return null
            em.assign(instance, inputResult as any)
            em.persist(instance)
            return instance
          },
          { parseInput, parent: undefined, outputSilk: entity }
        )
      },
    }
  }

  FindOneParameters() {
    const name = `${this.entity.meta.name}FindOneParameters`

    const gqlType =
      weaverContext.objectMap?.get(name) ??
      weaverContext.memo(
        MikroWeaver.getGraphQLType(this.entity, {
          pick: this.entity.meta.primaryKeys,
          name,
        })
      )

    return silk(gqlType, (value) => value)
  }

  /**
   * Create a `findOne` query for the given entity.
   */
  FindOneQuery<
    TInput extends GraphQLSilk<
      FindOneParameters<InferEntity<TSchema>>
    > = GraphQLSilk<
      FindOneParameters<InferEntity<TSchema>>,
      FindOneParameters<InferEntity<TSchema>>
    >,
  >({
    input = this.FindOneParameters() as TInput,
    ...options
  }: {
    input?: TInput
    middlewares?: Middleware<
      FieldOrOperation<undefined, TSchema, TInput, "query">
    >[]
  } & GraphQLFieldOptions = {}): FieldOrOperation<
    undefined,
    TSchema,
    TInput,
    "query"
  > {
    const entity = this.entity

    return {
      ...getFieldOptions(options),
      input,
      output: entity,
      type: "query",
      resolve: async (inputValue, extraOptions) => {
        const parseInput = createInputParser(input, inputValue)
        return applyMiddlewares(
          compose(extraOptions?.middlewares, options.middlewares),
          async () => {
            const em = await this.useEm()
            const inputResult = await parseInput()
            const pk = Utils.extractPK(inputResult, entity.meta)
            const instance = await em.findOne(entity, pk)
            return instance
          },
          { parseInput, parent: undefined, outputSilk: entity }
        )
      },
    }
  }

  /**
   * Create a `deleteOne` mutation for the given entity.
   */
  DeleteOneMutation<
    TInput extends GraphQLSilk<
      FindOneParameters<InferEntity<TSchema>>
    > = GraphQLSilk<
      FindOneParameters<InferEntity<TSchema>>,
      FindOneParameters<InferEntity<TSchema>>
    >,
  >({
    input = this.FindOneParameters() as TInput,
    ...options
  }: {
    input?: TInput
    middlewares?: Middleware<
      FieldOrOperation<undefined, TSchema, TInput, "mutation">
    >[]
  } & GraphQLFieldOptions = {}): FieldOrOperation<
    undefined,
    TSchema,
    TInput,
    "mutation"
  > {
    const entity = this.entity

    const middlewares = this.middlewaresWithFlush(options)

    return {
      ...getFieldOptions(options),
      input,
      output: entity,
      type: "mutation",
      resolve: async (inputValue, extraOptions) => {
        const parseInput = createInputParser(input, inputValue)
        return applyMiddlewares(
          compose(extraOptions?.middlewares, middlewares),
          async () => {
            const em = await this.useEm()
            const inputResult = await parseInput()
            const pk = Utils.extractPK(inputResult, entity.meta)
            const instance = await em.findOne(entity, pk)
            if (instance == null) return null
            em.remove(instance)
            return instance
          },
          { parseInput, parent: undefined, outputSilk: entity }
        )
      },
    }
  }

  protected middlewaresWithFlush<TField extends GenericFieldOrOperation>({
    middlewares,
  }: {
    middlewares?: Middleware<TField>[]
  }): Middleware<TField>[] {
    return middlewares?.includes(this.flushMiddleware)
      ? middlewares
      : compose(middlewares, [this.flushMiddleware])
  }
}

export type UpdateInput<TEntity> = Omit<
  Partial<TEntity>,
  PrimaryProperty<TEntity>
> & {
  [P in PrimaryProperty<TEntity>]: P extends keyof TEntity ? TEntity[P] : never
}

export type FindOneParameters<TEntity> = {
  [P in PrimaryProperty<TEntity>]: P extends keyof TEntity ? TEntity[P] : never
}
