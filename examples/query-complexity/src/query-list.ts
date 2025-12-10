export interface QueryCase {
  operationName: string
  query: string
  variables?: Record<string, any>
  complexity: number
}
export const queryList: QueryCase[] = [
  {
    operationName: "postWithTitle",
    query: /* GraphQL */ `
      query postWithTitle {
        post {
          title
        }
      }
    `,
    complexity: 2,
  },
  {
    operationName: "postWithTitleAndDescription",
    query: /* GraphQL */ `
      query postWithTitleAndDescription {
        post {
          title
          description
        }
      }
    `,
    complexity: 4,
  },
  {
    operationName: "postWithTitleAndDescriptionAndText",
    query: /* GraphQL */ `
      query postWithTitleAndDescriptionAndText {
        post {
          title
          description
          text
        }
      }
    `,
    complexity: 14,
  },
  {
    operationName: "postsWithTitle",
    query: /* GraphQL */ `
      query postsWithTitle {
        posts {
          title
        }
      }
    `,
    complexity: 10,
  },
  {
    operationName: "postsWithTitleLimit4",
    query: /* GraphQL */ `
      query postsWithTitleLimit4($limit: Int!) {
        posts(limit: $limit) {
          title
        }
      }
    `,
    variables: { limit: 4 },
    complexity: 4,
  },
  {
    operationName: "postsWithTitleDescriptionLimit4",
    query: /* GraphQL */ `
      query postsWithTitleDescriptionLimit4($limit: Int!) {
        posts(limit: $limit) {
          title
          description
        }
      }
    `,
    variables: { limit: 4 },
    complexity: 12,
  },
  {
    operationName: "postsWithTextLimit6",
    query: /* GraphQL */ `
      query postsWithTextLimit6($limit: Int!) {
        posts(limit: $limit) {
          title
          description
          text
        }
      }
    `,
    variables: { limit: 6 },
    complexity: 6 * (1 + 2 + 10),
  },
]
