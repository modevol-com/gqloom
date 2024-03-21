import type {
	FieldWeaver,
	AnyGraphQLFabric,
	OperationWeaver,
	ResolverWeaver,
	SchemaIOPaths,
} from "../resolver"

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const notImplemented: any = 0

export function createResolverWeaver<
	TBaseSchema,
	TSchemaIOPaths extends SchemaIOPaths,
>(
	converter: (schema: TBaseSchema) => AnyGraphQLFabric,
): ResolverWeaver<TBaseSchema, TSchemaIOPaths> {
	return notImplemented
}

export function createFieldWeaver<
	TBaseSchema,
	TSchemaIOPaths extends SchemaIOPaths,
>(
	converter: (schema: TBaseSchema) => AnyGraphQLFabric,
): FieldWeaver<TBaseSchema, TSchemaIOPaths> {
	return notImplemented
}

export function createQueryWeaver<
	TBaseSchema,
	TSchemaIOPaths extends SchemaIOPaths,
>(
	converter: (schema: TBaseSchema) => AnyGraphQLFabric,
): OperationWeaver<TBaseSchema, TSchemaIOPaths> {
	return notImplemented
}

export function createMutationWeaver<
	TBaseSchema,
	TSchemaIOPaths extends SchemaIOPaths,
>(
	converter: (schema: TBaseSchema) => AnyGraphQLFabric,
): OperationWeaver<TBaseSchema, TSchemaIOPaths> {
	return notImplemented
}

export function createResolverWeavers<
	TBaseSchema,
	TSchemaIOPaths extends SchemaIOPaths,
>(
	converter: (schema: TBaseSchema) => AnyGraphQLFabric,
): {
	query: OperationWeaver<TBaseSchema, TSchemaIOPaths>
	mutation: OperationWeaver<TBaseSchema, TSchemaIOPaths>
	field: FieldWeaver<TBaseSchema, TSchemaIOPaths>
	resolver: ResolverWeaver<TBaseSchema, TSchemaIOPaths>
} {
	return {
		query: createQueryWeaver<TBaseSchema, TSchemaIOPaths>(converter),
		mutation: createMutationWeaver<TBaseSchema, TSchemaIOPaths>(converter),
		field: createFieldWeaver<TBaseSchema, TSchemaIOPaths>(converter),
		resolver: createResolverWeaver<TBaseSchema, TSchemaIOPaths>(converter),
	}
}
