import {
  GraphQLObjectType,
  type ConstDirectiveNode,
  type ObjectTypeDefinitionNode,
  parse,
  Kind,
  type InputObjectTypeDefinitionNode,
  type InterfaceTypeDefinitionNode,
  type InputValueDefinitionNode,
  type FieldDefinitionNode,
  type GraphQLSchema,
  type NamedTypeNode,
  type GraphQLFieldMap,
  type GraphQLType,
  type TypeNode,
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarType,
  type ListTypeNode,
  type GraphQLArgument,
  astFromValue,
  type ConstValueNode,
  GraphQLInputObjectType,
  type GraphQLInputFieldMap,
  type GraphQLFieldExtensions,
  type GraphQLObjectTypeExtensions,
  GraphQLInterfaceType,
  GraphQLUnionType,
  type UnionTypeDefinitionNode,
  type EnumTypeDefinitionNode,
  type GraphQLEnumType,
  type GraphQLEnumValue,
  type EnumValueDefinitionNode,
  type ScalarTypeDefinitionNode,
  OperationTypeNode,
  type SchemaExtensionNode,
} from "graphql"
import { extractGqloomExtension } from "./extensions"

// Inspired by https://github.com/nestjs/graphql/blob/master/packages/graphql/lib/schema-builder/factories/ast-definition-node.factory.ts
// Inspired by https://github.com/MichalLytek/type-graphql/blob/master/src/schema/definition-node.ts
// Inspired by https://github.com/hayes/pothos/tree/main/packages/plugin-directives

export class NodeDefiner {
  static applySchemaTypeNode(schema: GraphQLSchema): GraphQLSchema {
    schema.extensionASTNodes ??= NodeDefiner.createSchemaExtensionNode(schema)

    Object.values(schema.getTypeMap()).forEach((type) => {
      if (type instanceof GraphQLObjectType) {
        type.astNode ??= NodeDefiner.createObjectTypeNode(type)
      } else if (type instanceof GraphQLInputObjectType) {
        type.astNode ??= NodeDefiner.createInputObjectNode(type)
      } else if (type instanceof GraphQLInterfaceType) {
        type.astNode ??= NodeDefiner.createInterfaceTypeNode(type)
      } else if (type instanceof GraphQLUnionType) {
        type.astNode ??= NodeDefiner.createUnionTypeNode(type)
      } else if (type instanceof GraphQLScalarType) {
        type.astNode ??= NodeDefiner.createScalarTypeNode(type)
      }
    })
    return schema
  }

  static createSchemaExtensionNode(
    schema: GraphQLSchema
  ): readonly SchemaExtensionNode[] {
    return [
      {
        kind: Kind.SCHEMA_EXTENSION,
        directives: NodeDefiner.extractDirectiveNodes(schema),
        operationTypes: (
          [
            {
              operation: OperationTypeNode.QUERY,
              node: schema.getQueryType(),
            },
            {
              operation: OperationTypeNode.MUTATION,
              node: schema.getMutationType(),
            },
            {
              operation: OperationTypeNode.SUBSCRIPTION,
              node: schema.getSubscriptionType(),
            },
          ] as const
        )
          .filter(
            ({ node, operation }) =>
              node &&
              node.name !== `${operation[0].toUpperCase()}${operation.slice(1)}`
          )
          .map(({ operation, node }) => ({
            kind: Kind.OPERATION_TYPE_DEFINITION,
            operation,
            type: {
              kind: Kind.NAMED_TYPE,
              name: { kind: Kind.NAME, value: node!.name },
            },
          })),
      },
    ]
  }

  static createObjectTypeNode(
    type: GraphQLObjectType
  ): ObjectTypeDefinitionNode {
    return {
      kind: Kind.OBJECT_TYPE_DEFINITION,
      name: { kind: Kind.NAME, value: type.name },
      description: type.description
        ? { kind: Kind.STRING, value: type.description }
        : undefined,
      interfaces: type
        .getInterfaces()
        .map((iface) => NodeDefiner.createTypeNode(iface) as NamedTypeNode),
      fields: NodeDefiner.createFieldNodes(type.getFields()),
      directives: type.extensions?.gqloom?.directives?.map(
        NodeDefiner.createDirectiveNode
      ),
    }
  }

  static createInputObjectNode(
    type: GraphQLInputObjectType
  ): InputObjectTypeDefinitionNode {
    return {
      kind: Kind.INPUT_OBJECT_TYPE_DEFINITION,
      name: { kind: Kind.NAME, value: type.name },
      description: type.description
        ? { kind: Kind.STRING, value: type.description }
        : undefined,
      fields: this.createInputFieldNodes(type.getFields()),
      directives: this.extractDirectiveNodes(type),
    }
  }

  static createInterfaceTypeNode(
    type: GraphQLInterfaceType
  ): InterfaceTypeDefinitionNode {
    return {
      kind: Kind.INTERFACE_TYPE_DEFINITION,
      name: { kind: Kind.NAME, value: type.name },
      description: type.description
        ? { kind: Kind.STRING, value: type.description }
        : undefined,
      interfaces: type
        .getInterfaces()
        .map((iface) => NodeDefiner.createTypeNode(iface) as NamedTypeNode),
      fields: NodeDefiner.createFieldNodes(type.getFields()),
      directives: NodeDefiner.extractDirectiveNodes(type),
    }
  }

  static createUnionTypeNode(type: GraphQLUnionType): UnionTypeDefinitionNode {
    return {
      kind: Kind.UNION_TYPE_DEFINITION,
      name: { kind: Kind.NAME, value: type.name },
      description: type.description
        ? { kind: Kind.STRING, value: type.description }
        : undefined,
      types: type
        .getTypes()
        .map((iface) => NodeDefiner.createTypeNode(iface) as NamedTypeNode),
      directives: NodeDefiner.extractDirectiveNodes(type),
    }
  }

  static createEnumTypeNode(type: GraphQLEnumType): EnumTypeDefinitionNode {
    return {
      kind: Kind.ENUM_TYPE_DEFINITION,
      name: { kind: Kind.NAME, value: type.name },
      description: type.description
        ? { kind: Kind.STRING, value: type.description }
        : undefined,
      values: this.createEnumValueNodes(type.getValues()),
      directives: NodeDefiner.extractDirectiveNodes(type),
    }
  }

  static createScalarTypeNode(
    type: GraphQLScalarType
  ): ScalarTypeDefinitionNode {
    return {
      kind: Kind.SCALAR_TYPE_DEFINITION,
      name: { kind: Kind.NAME, value: type.name },
      description: type.description
        ? { kind: Kind.STRING, value: type.description }
        : undefined,
      directives: NodeDefiner.extractDirectiveNodes(type),
    }
  }

  static createFieldNodes(
    fields: GraphQLFieldMap<unknown, unknown>
  ): FieldDefinitionNode[] {
    return Object.entries(fields).map(([fieldName, field]) => {
      field.astNode = {
        kind: Kind.FIELD_DEFINITION,
        description: field.description
          ? { kind: Kind.STRING, value: field.description }
          : undefined,
        name: { kind: Kind.NAME, value: fieldName },
        arguments: NodeDefiner.createArgumentNodes(field.args),
        type: NodeDefiner.createTypeNode(field.type),
        directives: field.extensions?.gqloom?.directives?.map(
          NodeDefiner.createDirectiveNode
        ),
      }

      return field.astNode!
    })
  }

  static createArgumentNodes(
    args: readonly GraphQLArgument[]
  ): InputValueDefinitionNode[] {
    return args.map((arg): InputValueDefinitionNode => {
      const defaultValueNode = astFromValue(
        arg.defaultValue,
        arg.type
      ) as ConstValueNode

      arg.astNode = {
        kind: Kind.INPUT_VALUE_DEFINITION,
        description: arg.description
          ? { kind: Kind.STRING, value: arg.description }
          : undefined,
        name: { kind: Kind.NAME, value: arg.name },
        type: NodeDefiner.createTypeNode(arg.type),
        defaultValue:
          arg.defaultValue === undefined ? undefined : defaultValueNode,
        directives: NodeDefiner.extractDirectiveNodes(arg),
      }

      return arg.astNode
    })
  }

  static createInputFieldNodes(
    fields: GraphQLInputFieldMap
  ): InputValueDefinitionNode[] {
    return Object.entries(fields).map(([fieldName, field]) => {
      const defaultValueNode = astFromValue(
        field.defaultValue,
        field.type
      ) as ConstValueNode

      field.astNode = {
        kind: Kind.INPUT_VALUE_DEFINITION,
        description: field.description
          ? { kind: Kind.STRING, value: field.description }
          : undefined,
        name: { kind: Kind.NAME, value: fieldName },
        type: NodeDefiner.createTypeNode(field.type),
        defaultValue:
          field.defaultValue === undefined ? undefined : defaultValueNode,
        directives: NodeDefiner.extractDirectiveNodes(field),
      }

      return field.astNode!
    })
  }

  static createTypeNode(type: GraphQLType): TypeNode {
    if (type instanceof GraphQLList) {
      return {
        kind: Kind.LIST_TYPE,
        type: NodeDefiner.createTypeNode(type.ofType),
      }
    }

    if (type instanceof GraphQLNonNull) {
      return {
        kind: Kind.NON_NULL_TYPE,
        type: NodeDefiner.createTypeNode(type.ofType as GraphQLType) as
          | ListTypeNode
          | NamedTypeNode,
      }
    }

    return {
      kind: Kind.NAMED_TYPE,
      name: { kind: Kind.NAME, value: type.name },
    }
  }

  static createEnumValueNodes(
    values: readonly GraphQLEnumValue[]
  ): readonly EnumValueDefinitionNode[] {
    return values.map((value): EnumValueDefinitionNode => {
      value.astNode = {
        kind: Kind.ENUM_VALUE_DEFINITION,
        description: value.description
          ? { kind: Kind.STRING, value: value.description }
          : undefined,
        name: { kind: Kind.NAME, value: value.name },
        directives: NodeDefiner.extractDirectiveNodes(value),
      }

      return value.astNode
    })
  }

  // https://github.com/nestjs/graphql/blob/master/packages/graphql/lib/schema-builder/factories/ast-definition-node.factory.ts
  static createDirectiveNode(sdl: string): ConstDirectiveNode {
    const parsed = parse(`type String ${sdl}`)
    const definitions = parsed.definitions as ObjectTypeDefinitionNode[]
    const directives = definitions
      .filter((item) => item.directives && item.directives.length > 0)
      .map(({ directives }) => directives ?? [])
      .reduce((acc, item) => [...acc, ...item])

    if (directives.length !== 1) {
      throw new Error(
        `Directive SDL "${sdl}" is invalid. Please, pass a valid directive definition.`
      )
    }
    return directives[0]
  }

  static extractDirectiveNodes({
    extensions,
    deprecationReason,
  }: {
    extensions?:
      | Readonly<
          GraphQLFieldExtensions<any, any, any> | GraphQLObjectTypeExtensions
        >
      | null
      | undefined
    deprecationReason?: string | null | undefined
  }): readonly ConstDirectiveNode[] | undefined {
    const directives = extractGqloomExtension({ extensions }).directives ?? []
    if (deprecationReason) {
      directives.push(`@deprecated(reason: "${deprecationReason}")`)
    }
    if (directives.length == 0) return undefined
    return extractGqloomExtension({ extensions }).directives?.map(
      NodeDefiner.createDirectiveNode
    )
  }
}
