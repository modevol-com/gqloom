import { parse } from "graphql"
import {
  fieldExtensionsEstimator,
  getComplexity,
  simpleEstimator,
} from "graphql-query-complexity"
import { describe, expect, it } from "vitest"
import { queryList } from "./query-list"
import { schema } from "./valibot"

describe("valibot schema query complexity", () => {
  it.each(
    queryList
  )("should return complexity $complexity for query: $operationName", ({
    query,
    complexity,
    operationName,
    variables,
  }) => {
    const parsedQuery = parse(query)
    const calculatedComplexity = getComplexity({
      schema,
      operationName,
      query: parsedQuery,
      variables,
      estimators: [
        fieldExtensionsEstimator(),
        simpleEstimator({ defaultComplexity: 1 }),
      ],
    })
    expect(calculatedComplexity).toBe(complexity)
  })
})
