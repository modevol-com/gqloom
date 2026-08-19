| Drizzle `type` (`extractExtendedColumnType`) | GraphQL Type     |
| -------------------------------------------- | ---------------- |
| boolean                                      | `GraphQLBoolean` |
| number                                       | `GraphQLInt` / `GraphQLFloat` |
| bigint, string, custom                       | `GraphQLString`  |
| object (json / date)                         | `GraphQLString`  |
| object (buffer)                              | `GraphQLList`    |
| array                                        | `GraphQLList`    |
