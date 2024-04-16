import {
  type ConstDirectiveNode,
  type ObjectTypeDefinitionNode,
  parse,
  Kind,
  type InputObjectTypeDefinitionNode,
  type InterfaceTypeDefinitionNode,
  type GraphQLOutputType,
  type GraphQLInputType,
  type InputValueDefinitionNode,
  type FieldDefinitionNode,
} from "graphql"
import { notNullish } from "../utils"

// Inspired by https://github.com/nestjs/graphql/blob/master/packages/graphql/lib/schema-builder/factories/ast-definition-node.factory.ts
// Inspired by https://github.com/MichalLytek/type-graphql/blob/master/src/schema/definition-node.ts

export function createObjectTypeNode(
  name: string,
  directives?: string[]
): ObjectTypeDefinitionNode | undefined {
  if (!directives || !directives.length) return
  return {
    kind: Kind.OBJECT_TYPE_DEFINITION,
    name: { kind: Kind.NAME, value: name },
    directives: directives.map(createDirectiveNode),
  }
}

export function createFieldNode(
  name: string,
  type: GraphQLInputType | GraphQLOutputType,
  directives?: string[]
): FieldDefinitionNode | undefined {
  if (!directives || !directives.length) return
  return {
    kind: Kind.FIELD_DEFINITION,
    type: {
      kind: Kind.NAMED_TYPE,
      name: { kind: Kind.NAME, value: type.toString() },
    },
    name: { kind: Kind.NAME, value: name },
    directives: directives.map(createDirectiveNode),
  }
}

export function ensureInputObjectNode(
  node:
    | ObjectTypeDefinitionNode
    | InterfaceTypeDefinitionNode
    | InputObjectTypeDefinitionNode
    | undefined
    | null
): InputObjectTypeDefinitionNode | undefined {
  if (node == null) return undefined
  return {
    ...node,
    fields: node.fields?.map(ensureInputValueNode).filter(notNullish),
    kind: Kind.INPUT_OBJECT_TYPE_DEFINITION,
  }
}

export function ensureInterfaceNode(
  node:
    | ObjectTypeDefinitionNode
    | InterfaceTypeDefinitionNode
    | undefined
    | null
): InterfaceTypeDefinitionNode | undefined {
  if (node == null) return undefined
  return { ...node, kind: Kind.INTERFACE_TYPE_DEFINITION }
}

export function ensureInputValueNode(
  node: InputValueDefinitionNode | FieldDefinitionNode | undefined | null
): InputValueDefinitionNode | undefined {
  if (node == null) return undefined
  return { ...node, kind: Kind.INPUT_VALUE_DEFINITION }
}

// https://github.com/nestjs/graphql/blob/master/packages/graphql/lib/schema-builder/factories/ast-definition-node.factory.ts
export function createDirectiveNode(sdl: string): ConstDirectiveNode {
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
