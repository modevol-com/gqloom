import type { GraphQLResolveInfo, SelectionSetNode } from "graphql"
import {
  type ArgumentNode,
  type DirectiveNode,
  type GraphQLOutputType,
  isInterfaceType,
  isObjectType,
  Kind,
  type SelectionNode,
} from "graphql"
import type { ResolverPayload } from "../resolver"
import { DERIVED_DEPENDENCIES } from "./constants"
import { unwrapType } from "./type"

/**
 * Represents the state of field resolution in a GraphQL query.
 */
export interface ResolvingFields {
  /**
   * Fields explicitly requested in the GraphQL query
   */
  requestedFields: ReadonlySet<string>
  /**
   * Fields that are derived from other fields (computed fields)
   */
  derivedFields: ReadonlySet<string>
  /**
   * Fields that derived fields depend on
   */
  derivedDependencies: ReadonlySet<string>
  /**
   * Final set of fields that need to be resolved, after processing derived fields
   */
  selectedFields: ReadonlySet<string>
}

/**
 * Analyzes and processes field resolution in a GraphQL query deeply.
 *
 * @param payload - The resolver payload containing the current field resolution context
 * @param [maxDepth=Infinity] - Maximum depth of nested fields to parse
 * @returns A map of field paths to their resolving fields
 */
export function getDeepResolvingFields(
  payload: Pick<ResolverPayload, "info">,
  maxDepth: number = Infinity
): Map<string, ResolvingFields> {
  const result = new Map<string, ResolvingFields>()
  const requestedFieldsByPath = ResolvingFieldsParser.parseDeep(
    payload.info,
    maxDepth
  )

  const rootType = unwrapType(payload.info.returnType)

  for (const [path, requestedFields] of requestedFieldsByPath.entries()) {
    let currentType: GraphQLOutputType = rootType
    if (path) {
      const pathParts = path.split(".")
      let tempType: GraphQLOutputType | undefined = rootType
      for (const part of pathParts) {
        const unwrapped = unwrapType(tempType)
        if (isObjectType(unwrapped) || isInterfaceType(unwrapped)) {
          const field = unwrapped.getFields()[part]
          if (field) {
            tempType = field.type
          } else {
            tempType = undefined
            break
          }
        } else {
          tempType = undefined
          break
        }
      }
      if (!tempType) continue
      currentType = tempType
    }

    const unwrappedCurrentType = unwrapType(currentType)

    if (isObjectType(unwrappedCurrentType)) {
      const derivedFields = new Set<string>()
      const derivedDependencies = new Set<string>()
      const objectFields = unwrappedCurrentType.getFields()
      for (const requestedFieldName of requestedFields) {
        const field = objectFields[requestedFieldName]
        if (field) {
          const deps = field.extensions?.[DERIVED_DEPENDENCIES]
          if (deps && Array.isArray(deps) && deps.length > 0) {
            derivedFields.add(requestedFieldName)
            for (const d of deps) derivedDependencies.add(d)
          }
        }
      }

      const selectedFields = new Set<string>(requestedFields)
      for (const f of derivedFields) selectedFields.delete(f)
      for (const d of derivedDependencies) selectedFields.add(d)

      result.set(path, {
        requestedFields,
        derivedFields,
        derivedDependencies,
        selectedFields,
      })
    }
  }

  return result
}

/**
 * Analyzes and processes field resolution in a GraphQL query.
 *
 * @param payload - The resolver payload containing the current field resolution context
 * @returns An object containing sets of different field types
 */
export function getResolvingFields(
  payload: Pick<ResolverPayload, "info">
): ResolvingFields {
  const requestedFields = parseResolvingFields(payload.info)
  const derivedFields = new Set<string>()
  const derivedDependencies = new Set<string>()
  const resolvingObject = unwrapType(payload.info.returnType)

  if (isObjectType(resolvingObject)) {
    const objectFields = resolvingObject.getFields()
    for (const fieldName of requestedFields) {
      const field = objectFields[fieldName]
      if (field) {
        const deps = field.extensions?.[DERIVED_DEPENDENCIES]
        if (deps && Array.isArray(deps)) {
          derivedFields.add(fieldName)
          for (const d of deps) derivedDependencies.add(d)
        }
      }
    }
  }

  const selectedFields = new Set<string>(requestedFields)

  for (const f of derivedFields) selectedFields.delete(f)
  for (const d of derivedDependencies) selectedFields.add(d)

  return { requestedFields, derivedFields, derivedDependencies, selectedFields }
}

/**
 * Parses the GraphQL resolve info to extract all requested fields.
 * Returns a Set of field paths where nested fields are represented as 'parent.field'.
 * Supports @include, @skip directives, fragments, and variables.
 *
 * @param info - The GraphQL resolve info object containing the query information
 * @param maxDepth - Maximum depth of nested fields to parse (default: 1)
 * @returns A Set of field paths
 */
export function parseResolvingFields(
  info: GraphQLResolveInfo,
  maxDepth: number = 1
): Set<string> {
  return ResolvingFieldsParser.parse(info, maxDepth)
}

/**
 * Class responsible for parsing GraphQL resolve info to extract all requested fields.
 */
class ResolvingFieldsParser {
  /** Store unique field paths grouped by parent path */
  private fields = new Map<string, Set<string>>()
  /** Track visited fragments to prevent circular references */
  private visitedFragments = new Set<string>()
  /** The GraphQL resolve info object */
  private info: GraphQLResolveInfo
  /** Maximum depth of nested fields to parse */
  private maxDepth: number

  public static parse(info: GraphQLResolveInfo, maxDepth: number): Set<string> {
    return new ResolvingFieldsParser(info, maxDepth).parse()
  }

  public static parseDeep(
    info: GraphQLResolveInfo,
    maxDepth: number
  ): Map<string, Set<string>> {
    return new ResolvingFieldsParser(info, maxDepth).parseDeep()
  }

  protected constructor(info: GraphQLResolveInfo, maxDepth: number) {
    this.info = info
    this.maxDepth = maxDepth
    // Start collecting fields from the root nodes
    for (const fieldNode of this.info.fieldNodes) {
      this.collectFields(fieldNode.selectionSet, "", 0)
    }
  }

  /**
   * Parses the GraphQL resolve info to extract all requested fields into a flat set.
   * @returns A Set of field paths
   */
  protected parse(): Set<string> {
    const flatFields = new Set<string>()
    for (const [path, fieldSet] of this.fields.entries()) {
      for (const fieldName of fieldSet) {
        const fullPath = path ? `${path}.${fieldName}` : fieldName
        flatFields.add(fullPath)
      }
    }

    // Add intermediate paths that are objects themselves
    for (const path of this.fields.keys()) {
      if (path) {
        flatFields.add(path)
      }
    }

    return flatFields
  }

  /**
   * Parses the GraphQL resolve info to extract all requested fields.
   * @returns A map of field paths to their requested fields
   */
  protected parseDeep(): Map<string, Set<string>> {
    return this.fields
  }

  /**
   * Recursively collects fields from a selection set.
   * Handles fields, inline fragments, and fragment spreads.
   *
   * @param selectionSet - The selection set to process
   * @param parentPath - The path of the parent field (for nested fields)
   * @param currentDepth - Current depth of recursion
   */
  private collectFields(
    selectionSet?: SelectionSetNode,
    parentPath: string = "",
    currentDepth: number = 0
  ): void {
    if (!selectionSet?.selections.length || currentDepth >= this.maxDepth)
      return

    if (!this.fields.has(parentPath)) {
      this.fields.set(parentPath, new Set<string>())
    }
    const currentFields = this.fields.get(parentPath)!

    for (const selection of selectionSet.selections) {
      // Skip if directives indicate this node should be excluded
      if (!this.shouldIncludeNode(selection)) continue

      switch (selection.kind) {
        case Kind.FIELD: {
          // Handle regular fields
          const fieldName = selection.name.value
          currentFields.add(fieldName)

          // Process nested fields if they exist
          const hasSelectionSet = selection.selectionSet != null
          if (hasSelectionSet) {
            const fieldPath = parentPath
              ? `${parentPath}.${fieldName}`
              : fieldName
            this.collectFields(
              selection.selectionSet,
              fieldPath,
              currentDepth + 1
            )
          }
          break
        }

        case Kind.INLINE_FRAGMENT: {
          // Handle inline fragments
          if (selection.selectionSet) {
            this.collectFields(selection.selectionSet, parentPath, currentDepth)
          }
          break
        }

        case Kind.FRAGMENT_SPREAD: {
          // Handle named fragments
          const fragmentName = selection.name.value
          // Prevent circular references
          if (this.visitedFragments.has(fragmentName)) continue
          this.visitedFragments.add(fragmentName)

          const fragment = this.info.fragments[fragmentName]
          if (fragment) {
            this.collectFields(fragment.selectionSet, parentPath, currentDepth)
          }
          break
        }
      }
    }
  }

  /**
   * Extracts the boolean value from a directive's 'if' argument.
   * Handles both literal boolean values and variables.
   *
   * @param directive - The directive node to extract value from
   * @returns The boolean value of the directive's condition
   */
  private getDirectiveValue(directive: DirectiveNode): boolean {
    const ifArg = directive.arguments?.find(
      (arg: ArgumentNode) => arg.name.value === "if"
    )
    if (!ifArg) return true

    const value = ifArg.value
    if (value.kind === Kind.BOOLEAN) {
      return value.value
    }
    if (value.kind === Kind.VARIABLE) {
      // Get value from variables
      const variableName = value.name.value
      const variableValue = this.info.variableValues?.[variableName]
      return variableValue === true
    }
    return true
  }

  /**
   * Determines if a selection node should be included based on its directives.
   * Handles both @include and @skip directives.
   *
   * @param node - The selection node to check
   * @returns Whether the node should be included
   */
  private shouldIncludeNode(node: SelectionNode): boolean {
    if (!node.directives?.length) return true
    return node.directives.every((directive: DirectiveNode) => {
      // Force coverage of include directive branch
      const isIncludeDirective = directive.name.value === "include"
      if (isIncludeDirective) {
        return this.getDirectiveValue(directive)
      }
      // Existing skip directive check
      if (directive.name.value === "skip") {
        return !this.getDirectiveValue(directive)
      }
      return true
    })
  }
}
