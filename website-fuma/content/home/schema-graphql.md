```graphql title="schema.graphql"
type Giraffe {
  """The giraffe's name"""
  name: String!
  birthday: String!
  age(currentDate: String): Int!
}
```