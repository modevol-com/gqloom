import type {
  AnyGraphQLFabric,
  FieldWeaver,
  OperationWeaver,
  ResolverWeaver,
  AbstractSchemaIO,
} from "../resolver"

const notImplemented: any = 0

export function createResolverWeaver<TSchemaIO extends AbstractSchemaIO>(
  _converter: (schema: TSchemaIO[0]) => AnyGraphQLFabric
): ResolverWeaver<TSchemaIO> {
  return notImplemented
}

export function createFieldWeaver<TSchemaIO extends AbstractSchemaIO>(
  _converter: (schema: TSchemaIO[0]) => AnyGraphQLFabric
): FieldWeaver<TSchemaIO> {
  return notImplemented
}

export function createQueryWeaver<TSchemaIO extends AbstractSchemaIO>(
  _converter: (schema: TSchemaIO[0]) => AnyGraphQLFabric
): OperationWeaver<TSchemaIO> {
  return notImplemented
}

export function createMutationWeaver<TSchemaIO extends AbstractSchemaIO>(
  _converter: (schema: TSchemaIO[0]) => AnyGraphQLFabric
): OperationWeaver<TSchemaIO> {
  return notImplemented
}

export function createLoom<TSchemaIO extends AbstractSchemaIO>(
  converter: (schema: TSchemaIO[0]) => AnyGraphQLFabric
): {
  query: OperationWeaver<TSchemaIO>
  mutation: OperationWeaver<TSchemaIO>
  field: FieldWeaver<TSchemaIO>
  resolver: ResolverWeaver<TSchemaIO>
} {
  return {
    query: createQueryWeaver<TSchemaIO>(converter),
    mutation: createMutationWeaver<TSchemaIO>(converter),
    field: createFieldWeaver<TSchemaIO>(converter),
    resolver: createResolverWeaver<TSchemaIO>(converter),
  }
}
