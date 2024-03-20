import type {
	ResolverWeaver,
	FieldWeaver,
	OperationWeaver,
	GraphQLFabric,
	SchemaIOPaths,
} from "../resolver"

export function createResolverWeaver<
	TBaseSchema,
	TSchemaIOPaths extends SchemaIOPaths,
>(
	converter: (schema: TBaseSchema) => GraphQLFabric<any, any>,
): ResolverWeaver<TBaseSchema, TSchemaIOPaths> {
	return 0 as any
}

export function createFieldWeaver<
	TBaseSchema,
	TSchemaIOPaths extends SchemaIOPaths,
>(
	converter: (schema: TBaseSchema) => GraphQLFabric<any, any>,
): FieldWeaver<TBaseSchema, TSchemaIOPaths> {
	return 0 as any
}

export function createQueryWeaver<
	TBaseSchema,
	TSchemaIOPaths extends SchemaIOPaths,
>(
	converter: (schema: TBaseSchema) => GraphQLFabric<any, any>,
): OperationWeaver<TBaseSchema, TSchemaIOPaths> {
	return 0 as any
}

export function createMutationWeaver<
	TBaseSchema,
	TSchemaIOPaths extends SchemaIOPaths,
>(
	converter: (schema: TBaseSchema) => GraphQLFabric<any, any>,
): OperationWeaver<TBaseSchema, TSchemaIOPaths> {
	return 0 as any
}

export function createResolverWeavers<
	TBaseSchema,
	TSchemaIOPaths extends SchemaIOPaths,
>(
	converter: (schema: TBaseSchema) => GraphQLFabric<any, any>,
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
