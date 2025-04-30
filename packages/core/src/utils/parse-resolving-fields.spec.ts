import {
  GraphQLInterfaceType,
  GraphQLNonNull,
  GraphQLObjectType,
  type GraphQLResolveInfo,
  GraphQLString,
  GraphQLUnionType,
  execute,
  parse,
} from "graphql"
import { describe, expect, it } from "vitest"
import {
  field,
  query,
  resolver,
  silk,
  useResolverPayload,
  weave,
} from "../../src"
import { parseResolvingFields } from "./parse-resolving-fields"

describe("parseResolvingFields", () => {
  let info: GraphQLResolveInfo

  // Create a test schema with nested types
  const UserType = new GraphQLObjectType({
    name: "User",
    fields: {
      id: { type: GraphQLString },
      name: { type: GraphQLString },
      profile: {
        type: new GraphQLObjectType({
          name: "Profile",
          fields: {
            email: { type: GraphQLString },
            phone: { type: GraphQLString },
            address: {
              type: new GraphQLObjectType({
                name: "Address",
                fields: {
                  street: { type: GraphQLString },
                  city: { type: GraphQLString },
                },
              }),
            },
          },
        }),
      },
    },
  })

  // Create interface and union types for testing
  const NodeInterface = new GraphQLInterfaceType({
    name: "Node",
    fields: {
      id: { type: GraphQLString },
    },
  })

  const AdminType = new GraphQLObjectType({
    name: "Admin",
    interfaces: [NodeInterface],
    fields: {
      id: { type: GraphQLString },
      role: { type: GraphQLString },
    },
  })

  const UserUnion = new GraphQLUnionType({
    name: "UserUnion",
    types: [UserType, AdminType],
  })

  const testResolver = resolver({
    user: query(silk(UserType)).resolve(() => {
      info = useResolverPayload()!.info
      return {
        id: "1",
        name: "Test User",
        profile: {
          email: "test@example.com",
          phone: "1234567890",
          address: {
            street: "123 Main St",
            city: "Test City",
          },
        },
      }
    }),
    admin: query(silk(AdminType)).resolve(() => {
      info = useResolverPayload()!.info
      return {
        id: "2",
        role: "admin",
      }
    }),
    userUnion: query(silk(UserUnion)).resolve(() => {
      info = useResolverPayload()!.info
      return {
        id: "1",
        name: "Test User",
        profile: {
          email: "test@example.com",
          phone: "1234567890",
        },
      }
    }),
  })

  const schema = weave(testResolver)

  it("should parse simple fields", async () => {
    await execute({
      schema,
      document: parse(/* GraphQL */ `
        query {
          user {
            id
            name
          }
        }
      `),
    })

    const fields = parseResolvingFields(info)
    expect(fields).toEqual(new Set(["id", "name"]))
  })

  it("should parse nested fields", async () => {
    await execute({
      schema,
      document: parse(/* GraphQL */ `
        query {
          user {
            profile {
              email
              phone
            }
          }
        }
      `),
    })

    const fields = parseResolvingFields(info)
    expect(fields).toEqual(
      new Set(["profile", "profile.email", "profile.phone"])
    )
  })

  it("should parse deeply nested fields", async () => {
    await execute({
      schema,
      document: parse(/* GraphQL */ `
        query {
          user {
            profile {
              address {
                street
                city
              }
            }
          }
        }
      `),
    })

    const fields = parseResolvingFields(info)
    expect(fields).toEqual(
      new Set([
        "profile",
        "profile.address",
        "profile.address.street",
        "profile.address.city",
      ])
    )
  })

  it("should handle @include directive with true value", async () => {
    await execute({
      schema,
      document: parse(/* GraphQL */ `
        query($showProfile: Boolean!) {
          user {
            id
            profile @include {
              email
            }
          }
        }
      `),
      variableValues: {
        showProfile: true,
      },
    })

    const fields = parseResolvingFields(info)
    expect(fields).toEqual(new Set(["id", "profile", "profile.email"]))
  })

  it("should handle @include directive with true value", async () => {
    await execute({
      schema,
      document: parse(/* GraphQL */ `
        query($showProfile: Boolean!) {
          user {
            id
            profile @include(if: $showProfile) {
              email
            }
          }
        }
      `),
      variableValues: {
        showProfile: true,
      },
    })

    const fields = parseResolvingFields(info)
    expect(fields).toEqual(new Set(["id", "profile", "profile.email"]))
  })

  it("should handle @include directive with false value", async () => {
    await execute({
      schema,
      document: parse(/* GraphQL */ `
        query($showProfile: Boolean!) {
          user {
            id
            profile @include(if: $showProfile) {
              email
            }
          }
        }
      `),
      variableValues: {
        showProfile: false,
      },
    })

    const fields = parseResolvingFields(info)
    expect(fields).toEqual(new Set(["id"]))
  })

  it("should handle @skip directive with true value", async () => {
    await execute({
      schema,
      document: parse(/* GraphQL */ `
        query($hideProfile: Boolean!) {
          user {
            id
            profile @skip(if: $hideProfile) {
              email
            }
          }
        }
      `),
      variableValues: {
        hideProfile: true,
      },
    })

    const fields = parseResolvingFields(info)
    expect(fields).toEqual(new Set(["id"]))
  })

  it("should handle @skip directive with false value", async () => {
    await execute({
      schema,
      document: parse(/* GraphQL */ `
        query($hideProfile: Boolean!) {
          user {
            id
            profile @skip(if: $hideProfile) {
              email
            }
          }
        }
      `),
      variableValues: {
        hideProfile: false,
      },
    })

    const fields = parseResolvingFields(info)
    expect(fields).toEqual(new Set(["id", "profile", "profile.email"]))
  })

  it("should handle undefined variable values", async () => {
    await execute({
      schema,
      document: parse(/* GraphQL */ `
        query($showProfile: Boolean) {
          user {
            id
            profile @include(if: $showProfile) {
              email
            }
          }
        }
      `),
      variableValues: {
        showProfile: undefined,
      },
    })

    const fields = parseResolvingFields(info)
    expect(fields).toEqual(new Set(["id"]))
  })

  it("should handle multiple directives", async () => {
    await execute({
      schema,
      document: parse(/* GraphQL */ `
        query($showProfile: Boolean!, $showEmail: Boolean!) {
          user {
            id
            profile @include(if: $showProfile) @skip(if: $showEmail) {
              email
            }
          }
        }
      `),
      variableValues: {
        showProfile: true,
        showEmail: false,
      },
    })

    const fields = parseResolvingFields(info)
    expect(fields).toEqual(new Set(["id", "profile", "profile.email"]))
  })

  it("should handle field aliases", async () => {
    await execute({
      schema,
      document: parse(/* GraphQL */ `
        query {
          user {
            id
            userName: name
            profile {
              email
            }
          }
        }
      `),
    })

    const fields = parseResolvingFields(info)
    expect(fields).toEqual(new Set(["id", "name", "profile", "profile.email"]))
  })

  it("should handle interface types", async () => {
    await execute({
      schema,
      document: parse(/* GraphQL */ `
        query {
          admin {
            id
            role
          }
        }
      `),
    })

    const fields = parseResolvingFields(info)
    expect(fields).toEqual(new Set(["id", "role"]))
  })

  it("should handle union types", async () => {
    await execute({
      schema,
      document: parse(/* GraphQL */ `
        query {
          userUnion {
            ... on User {
              id
              name
              profile {
                email
              }
            }
            ... on Admin {
              id
              role
            }
          }
        }
      `),
    })

    const fields = parseResolvingFields(info)
    expect(fields).toEqual(
      new Set(["id", "name", "profile", "profile.email", "role"])
    )
  })

  it("should handle fragments", async () => {
    await execute({
      schema,
      document: parse(/* GraphQL */ `
        fragment ProfileFields on Profile {
          email
          phone
        }
        query {
          user {
            id
            profile {
              ...ProfileFields
            }
          }
        }
      `),
    })

    const fields = parseResolvingFields(info)
    expect(fields).toEqual(
      new Set(["id", "profile", "profile.email", "profile.phone"])
    )
  })

  it("should handle inline fragments", async () => {
    await execute({
      schema,
      document: parse(/* GraphQL */ `
        query {
          user {
            id
            ... on User {
              name
              profile {
                email
              }
            }
          }
        }
      `),
    })

    const fields = parseResolvingFields(info)
    expect(fields).toEqual(new Set(["id", "name", "profile", "profile.email"]))
  })

  it("should handle multiple fragments", async () => {
    await execute({
      schema,
      document: parse(/* GraphQL */ `
        fragment ProfileFields on Profile {
          email
        }
        fragment AddressFields on Address {
          street
          city
        }
        query {
          user {
            profile {
              ...ProfileFields
              address {
                ...AddressFields
              }
            }
          }
        }
      `),
    })

    const fields = parseResolvingFields(info)
    expect(fields).toEqual(
      new Set([
        "profile",
        "profile.email",
        "profile.address",
        "profile.address.street",
        "profile.address.city",
      ])
    )
  })

  it("should handle circular fragment references", async () => {
    await execute({
      schema,
      document: parse(/* GraphQL */ `
        fragment A on User {
          id
          ...B
        }
        fragment B on User {
          name
          ...A
        }
        query {
          user {
            ...A
          }
        }
      `),
    })

    const fields = parseResolvingFields(info)
    expect(fields).toEqual(new Set(["id", "name"]))
  })

  it("should handle directives without if argument", async () => {
    await execute({
      schema,
      document: parse(/* GraphQL */ `
        query {
          user {
            id
            profile @deprecated {
              email
            }
          }
        }
      `),
    })

    const fields = parseResolvingFields(info)
    expect(fields).toEqual(new Set(["id", "profile", "profile.email"]))
  })

  it("should handle directives with boolean values", async () => {
    await execute({
      schema,
      document: parse(/* GraphQL */ `
        query {
          user {
            id
            profile @include(if: true) {
              email
            }
          }
        }
      `),
    })

    const fields = parseResolvingFields(info)
    expect(fields).toEqual(new Set(["id", "profile", "profile.email"]))
  })

  it("should handle directives with non-boolean values", async () => {
    await execute({
      schema,
      document: parse(/* GraphQL */ `
        query {
          user {
            id
            profile @include(if: "true") {
              email
            }
          }
        }
      `),
    })

    const fields = parseResolvingFields(info)
    expect(fields).toEqual(new Set(["id", "profile", "profile.email"]))
  })

  it("should handle directives with non-variable values", async () => {
    await execute({
      schema,
      document: parse(/* GraphQL */ `
        query {
          user {
            id
            profile @include(if: 1) {
              email
            }
          }
        }
      `),
    })

    const fields = parseResolvingFields(info)
    expect(fields).toEqual(new Set(["id", "profile", "profile.email"]))
  })

  it("should handle directives with null variable values", async () => {
    await execute({
      schema,
      document: parse(/* GraphQL */ `
        query($showProfile: Boolean) {
          user {
            id
            profile @include(if: $showProfile) {
              email
            }
          }
        }
      `),
      variableValues: {
        showProfile: null,
      },
    })

    const fields = parseResolvingFields(info)
    expect(fields).toEqual(new Set(["id"]))
  })

  it("should handle directives with non-boolean variable values", async () => {
    await execute({
      schema,
      document: parse(/* GraphQL */ `
        query($showProfile: Boolean) {
          user {
            id
            profile @include(if: $showProfile) {
              email
            }
          }
        }
      `),
      variableValues: {
        showProfile: "true" as any, // TypeScript will complain, but we want to test runtime behavior
      },
    })

    const fields = parseResolvingFields(info)
    expect(fields).toEqual(new Set(["id"]))
  })

  it("should handle undefined variableValues", async () => {
    await execute({
      schema,
      document: parse(/* GraphQL */ `
        query($showProfile: Boolean) {
          user {
            id
            profile @include(if: $showProfile) {
              email
            }
          }
        }
      `),
      // Intentionally not providing variableValues
    })

    const fields = parseResolvingFields(info)
    expect(fields).toEqual(new Set(["id"]))
  })

  it("should explicitly test Kind.BOOLEAN directive value", async () => {
    // This test specifically targets the if (value.kind === Kind.BOOLEAN) branch
    await execute({
      schema,
      document: parse(/* GraphQL */ `
        query {
          user {
            id
            profile @include(if: true) {
              email
            }
          }
        }
      `),
    })

    const fields = parseResolvingFields(info)
    expect(fields).toEqual(new Set(["id", "profile", "profile.email"]))
  })

  it("should explicitly test directive.name.value === 'include'", async () => {
    // This test specifically targets the if (directive.name.value === "include") branch
    await execute({
      schema,
      document: parse(/* GraphQL */ `
        query {
          user {
            id
            profile @include(if: true) {
              email
            }
            name @skip(if: false)
          }
        }
      `),
    })

    const fields = parseResolvingFields(info)
    expect(fields).toEqual(new Set(["id", "profile", "profile.email", "name"]))
  })

  it("should explicitly test nested field with selection set", async () => {
    // This test specifically targets the if (selection.selectionSet) branch
    await execute({
      schema,
      document: parse(/* GraphQL */ `
        query {
          user {
            id
            profile {
              email
            }
          }
        }
      `),
    })

    const fields = parseResolvingFields(info)
    expect(fields).toEqual(new Set(["id", "profile", "profile.email"]))
  })
})

describe("parseResolvingFields for nested field", () => {
  let userInfo: GraphQLResolveInfo
  let profileInfo: GraphQLResolveInfo
  let addressInfo: GraphQLResolveInfo

  // Create a test schema with nested types
  const User = silk(
    new GraphQLObjectType<{ id: string; name: string }>({
      name: "User",
      fields: {
        id: { type: new GraphQLNonNull(GraphQLString) },
        name: { type: new GraphQLNonNull(GraphQLString) },
      },
    })
  )

  const Profile = silk(
    new GraphQLObjectType<{ email: string; phone: string }>({
      name: "Profile",
      fields: {
        email: { type: new GraphQLNonNull(GraphQLString) },
        phone: { type: new GraphQLNonNull(GraphQLString) },
      },
    })
  )

  const Address = silk(
    new GraphQLObjectType<{ street: string; city: string }>({
      name: "Address",
      fields: {
        street: { type: new GraphQLNonNull(GraphQLString) },
        city: { type: new GraphQLNonNull(GraphQLString) },
      },
    })
  )

  const userResolver = resolver.of(User, {
    user: query(User).resolve(() => {
      userInfo = useResolverPayload()!.info
      return {
        id: "1",
        name: "Test User",
      }
    }),

    profile: field(Profile).resolve(() => {
      profileInfo = useResolverPayload()!.info
      return {
        email: "test@example.com",
        phone: "1234567890",
      }
    }),
  })
  const profileResolver = resolver.of(Profile, {
    address: field(Address).resolve(() => {
      addressInfo = useResolverPayload()!.info
      return {
        street: "123 Main St",
        city: "Test City",
      }
    }),
  })

  const schema = weave(userResolver, profileResolver)

  it("should parse fields at user level", async () => {
    await execute({
      schema,
      document: parse(/* GraphQL */ `
        query {
          user {
            id
            name
          }
        }
      `),
    })

    const fields = parseResolvingFields(userInfo)
    expect(fields).toEqual(new Set(["id", "name"]))
  })

  it("should parse nested profile fields", async () => {
    await execute({
      schema,
      document: parse(/* GraphQL */ `
        query {
          user {
            id
            profile {
              email
              phone
            }
          }
        }
      `),
    })

    const userFields = parseResolvingFields(userInfo)
    expect(userFields).toEqual(
      new Set(["id", "profile", "profile.email", "profile.phone"])
    )

    const profileFields = parseResolvingFields(profileInfo)
    expect(profileFields).toEqual(new Set(["email", "phone"]))
  })

  it("should parse deeply nested address fields", async () => {
    await execute({
      schema,
      document: parse(/* GraphQL */ `
        query {
          user {
            profile {
              address {
                street
                city
              }
            }
          }
        }
      `),
    })

    const userFields = parseResolvingFields(userInfo)
    expect(userFields).toEqual(
      new Set([
        "profile",
        "profile.address",
        "profile.address.street",
        "profile.address.city",
      ])
    )

    const profileFields = parseResolvingFields(profileInfo)
    expect(profileFields).toEqual(
      new Set(["address", "address.street", "address.city"])
    )

    const addressFields = parseResolvingFields(addressInfo)
    expect(addressFields).toEqual(new Set(["street", "city"]))
  })

  it("should handle field selection at multiple levels", async () => {
    await execute({
      schema,
      document: parse(/* GraphQL */ `
        query {
          user {
            id
            name
            profile {
              email
              address {
                city
              }
            }
          }
        }
      `),
    })

    const userFields = parseResolvingFields(userInfo)
    expect(userFields).toEqual(
      new Set([
        "id",
        "name",
        "profile",
        "profile.email",
        "profile.address",
        "profile.address.city",
      ])
    )

    const profileFields = parseResolvingFields(profileInfo)
    expect(profileFields).toEqual(new Set(["email", "address", "address.city"]))

    const addressFields = parseResolvingFields(addressInfo)
    expect(addressFields).toEqual(new Set(["city"]))
  })

  it("should handle directives at nested levels", async () => {
    await execute({
      schema,
      document: parse(/* GraphQL */ `
        query($includeEmail: Boolean!, $includeStreet: Boolean!) {
          user {
            profile {
              email @include(if: $includeEmail)
              phone
              address {
                street @include(if: $includeStreet)
                city
              }
            }
          }
        }
      `),
      variableValues: {
        includeEmail: true,
        includeStreet: false,
      },
    })

    const profileFields = parseResolvingFields(profileInfo)
    expect(profileFields).toEqual(
      new Set(["email", "phone", "address", "address.city"])
    )

    const addressFields = parseResolvingFields(addressInfo)
    expect(addressFields).toEqual(new Set(["city"]))
  })

  it("should explicitly cover the isIncludeDirective branch", async () => {
    await execute({
      schema,
      document: parse(/* GraphQL */ `
        query {
          user {
            profile {
              email @include
              phone @include(if: true)
              address @include(if: false) {
                street
                city
              }
            }
          }
        }
      `),
    })

    const profileFields = parseResolvingFields(profileInfo)
    expect(profileFields).toEqual(new Set(["email", "phone"]))
  })
})
