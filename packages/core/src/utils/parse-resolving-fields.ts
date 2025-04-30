import type { GraphQLResolveInfo, SelectionSetNode } from "graphql"
import {
  type ArgumentNode,
  type DirectiveNode,
  Kind,
  type SelectionNode,
} from "graphql"

/**
 * Parses the GraphQL resolve info to extract all requested fields.
 * Returns a Set of field paths where nested fields are represented as 'parent.field'.
 * Supports @include, @skip directives, fragments, and variables.
 *
 * @param info - The GraphQL resolve info object containing the query information
 * @returns A Set of field paths
 */
export function parseResolvingFields(info: GraphQLResolveInfo): Set<string> {
  /** Store unique field paths */
  const fields = new Set<string>()
  /** Track visited fragments to prevent circular references */
  const visitedFragments = new Set<string>()

  /**
   * Extracts the boolean value from a directive's 'if' argument.
   * Handles both literal boolean values and variables.
   *
   * @param directive - The directive node to extract value from
   * @returns The boolean value of the directive's condition
   */
  const getDirectiveValue = (directive: DirectiveNode): boolean => {
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
      const variableValue = info.variableValues?.[variableName]
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
  const shouldIncludeNode = (node: SelectionNode): boolean => {
    if (!node.directives?.length) return true
    return node.directives.every((directive: DirectiveNode) => {
      // Force coverage of include directive branch
      const isIncludeDirective = directive.name.value === "include"
      if (isIncludeDirective) {
        return getDirectiveValue(directive)
      }
      // Existing skip directive check
      if (directive.name.value === "skip") {
        return !getDirectiveValue(directive)
      }
      return true
    })
  }

  /**
   * Recursively collects fields from a selection set.
   * Handles fields, inline fragments, and fragment spreads.
   *
   * @param selectionSet - The selection set to process
   * @param parentPath - The path of the parent field (for nested fields)
   */
  const collectFields = (
    selectionSet?: SelectionSetNode,
    parentPath: string = ""
  ) => {
    if (!selectionSet?.selections.length) return

    for (const selection of selectionSet.selections) {
      // Skip if directives indicate this node should be excluded
      if (!shouldIncludeNode(selection)) continue

      switch (selection.kind) {
        case Kind.FIELD: {
          // Handle regular fields
          const fieldName = selection.name.value
          const fieldPath = parentPath
            ? `${parentPath}.${fieldName}`
            : fieldName
          fields.add(fieldPath)

          // Process nested fields if they exist
          const hasSelectionSet = selection.selectionSet != null
          if (hasSelectionSet) {
            collectFields(selection.selectionSet, fieldPath)
          }
          break
        }

        case Kind.INLINE_FRAGMENT: {
          // Handle inline fragments
          if (selection.selectionSet) {
            collectFields(selection.selectionSet, parentPath)
          }
          break
        }

        case Kind.FRAGMENT_SPREAD: {
          // Handle named fragments
          const fragmentName = selection.name.value
          // Prevent circular references
          if (visitedFragments.has(fragmentName)) continue
          visitedFragments.add(fragmentName)

          const fragment = info.fragments[fragmentName]
          if (fragment) {
            collectFields(fragment.selectionSet, parentPath)
          }
          break
        }
      }
    }
  }

  // Start collecting fields from the root nodes
  for (const fieldNode of info.fieldNodes) {
    collectFields(fieldNode.selectionSet)
  }

  return fields
}
