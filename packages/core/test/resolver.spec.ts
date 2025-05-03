import { type ResolverPayload, silk, weave } from "@gqloom/core"
import {
  GraphQLFloat,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
  execute,
  parse,
} from "graphql"
import { beforeEach, describe, expect, it } from "vitest"
import { field, mutation, query, resolver } from "../src/resolver/resolver"

describe("resolver", () => {
  interface IGiraffe {
    name: string
    birthday: string
    heightInMeters: number
  }
  const Giraffe = new GraphQLObjectType<IGiraffe>({
    name: "Giraffe",
    fields: {
      name: { type: GraphQLString },
      birthday: { type: GraphQLString },
      heightInMeters: { type: GraphQLFloat },
    },
  })

  describe("chainResolver", () => {
    const giraffes = new Map<string, IGiraffe>()
    let mutationPayload: ResolverPayload | undefined
    let queryPayload: ResolverPayload | undefined
    let fieldPayload: ResolverPayload | undefined

    const chainResolver = resolver.of(silk(Giraffe), {
      giraffes: query(silk.list(silk(Giraffe))).resolve((_input, payload) => {
        queryPayload = payload
        return Array.from(giraffes.values())
      }),

      age: field(silk(new GraphQLNonNull(GraphQLInt))).resolve(
        (parent, _input, payload) => {
          fieldPayload = payload
          const today = new Date()
          const birthday = new Date(parent.birthday)
          const age = today.getFullYear() - birthday.getFullYear()
          return age
        }
      ),

      saveGiraffe: mutation(silk(Giraffe))
        .input(
          silk(
            new GraphQLNonNull(
              new GraphQLObjectType<IGiraffe>({
                name: "GiraffeInput",
                fields: {
                  name: { type: GraphQLString },
                  birthday: { type: GraphQLString },
                  heightInMeters: { type: GraphQLFloat },
                },
              })
            )
          )
        )
        .resolve((input, payload) => {
          mutationPayload = payload
          giraffes.set(input.name, input)
          return input
        }),
    })
    beforeEach(() => {
      giraffes.clear()
      queryPayload = undefined
      mutationPayload = undefined
      fieldPayload = undefined
    })
    const schema = weave(chainResolver)
    describe("mutation", () => {
      it("should work", async () => {
        const query = parse(/* GraphQL */ `
        mutation($name: String!, $birthday: String!, $heightInMeters: Float!) {
          saveGiraffe(
            name: $name,
            birthday: $birthday,
            heightInMeters: $heightInMeters
          ) {
            name
          }
        }
      `)
        const result = await execute({
          schema,
          document: query,
          variableValues: {
            name: "Giraffe",
            birthday: "2020-01-01",
            heightInMeters: 5.5,
          },
        })
        expect(result.data?.saveGiraffe).toEqual({ name: "Giraffe" })
      })

      it("should accept payload", async () => {
        await execute({
          schema,
          document: parse(/* GraphQL */ `
            mutation($name: String!, $birthday: String!, $heightInMeters: Float!) {
              saveGiraffe(
                name: $name,
                birthday: $birthday,
                heightInMeters: $heightInMeters
              ) {
                name
              }
            }
          `),
          variableValues: {
            name: "Giraffe",
            birthday: "2020-01-01",
            heightInMeters: 5.5,
          },
        })
        expect(mutationPayload).toBeDefined()
        expect(mutationPayload?.field["~meta"].operation).toEqual("mutation")
        expect(mutationPayload?.args).toEqual({
          birthday: "2020-01-01",
          heightInMeters: 5.5,
          name: "Giraffe",
        })
        expect(mutationPayload?.context).toEqual(undefined)
        expect(mutationPayload?.info.fieldName).toEqual("saveGiraffe")
        expect(mutationPayload?.root).toEqual(undefined)
      })
    })

    describe("query", () => {
      it("should work", async () => {
        // Add test data
        giraffes.set("Giraffe1", {
          name: "Giraffe1",
          birthday: "2020-01-01",
          heightInMeters: 5.5,
        })
        giraffes.set("Giraffe2", {
          name: "Giraffe2",
          birthday: "2021-01-01",
          heightInMeters: 4.5,
        })

        const query = parse(/* GraphQL */ `
          query {
            giraffes {
              name
              birthday
              heightInMeters
            }
          }
        `)

        const result = await execute({
          schema,
          document: query,
        })

        expect(result.data?.giraffes).toEqual([
          {
            name: "Giraffe1",
            birthday: "2020-01-01",
            heightInMeters: 5.5,
          },
          {
            name: "Giraffe2",
            birthday: "2021-01-01",
            heightInMeters: 4.5,
          },
        ])
      })

      it("should accept payload", async () => {
        // Add test data first
        giraffes.set("Giraffe1", {
          name: "Giraffe1",
          birthday: "2020-01-01",
          heightInMeters: 5.5,
        })
        await execute({
          schema,
          document: parse(/* GraphQL */ `
            query {
              giraffes {
                name
              }
            }
          `),
        })

        expect(queryPayload).toBeDefined()
        expect(queryPayload?.field["~meta"].operation).toEqual("query")
        expect(queryPayload?.args).toEqual({})
        expect(queryPayload?.context).toEqual(undefined)
        expect(queryPayload?.info.fieldName).toEqual("giraffes")
        expect(queryPayload?.root).toEqual(undefined)
      })
    })

    describe("field", () => {
      it("should work", async () => {
        // Add test data
        giraffes.set("Giraffe1", {
          name: "Giraffe1",
          birthday: "2020-01-01",
          heightInMeters: 5.5,
        })

        const query = parse(/* GraphQL */ `
          query {
            giraffes {
              name
              age
            }
          }
        `)

        const result = await execute({
          schema,
          document: query,
        })

        const currentYear = new Date().getFullYear()
        expect((result.data as any)?.giraffes?.[0]?.age).toBe(
          currentYear - 2020
        )
      })

      it("should accept payload", async () => {
        const giraffe = {
          name: "Giraffe1",
          birthday: "2020-01-01",
          heightInMeters: 5.5,
        }
        giraffes.set("Giraffe1", giraffe)
        await execute({
          schema,
          document: parse(/* GraphQL */ `
            query {
              giraffes {
                age
              }
            }
          `),
        })

        expect(fieldPayload).toBeDefined()
        expect(fieldPayload?.field["~meta"].operation).toEqual("field")
        expect(fieldPayload?.args).toEqual({})
        expect(fieldPayload?.context).toEqual(undefined)
        expect(fieldPayload?.info.fieldName).toEqual("age")
        expect(fieldPayload?.root).toEqual(giraffe)
      })
    })
  })

  describe("optionalResolver", () => {
    const giraffes = new Map<string, IGiraffe>()
    let mutationPayload: ResolverPayload | undefined
    let queryPayload: ResolverPayload | undefined
    let fieldPayload: ResolverPayload | undefined

    const chainResolver = resolver.of(silk(Giraffe), {
      giraffes: query(silk.list(silk(Giraffe)), {
        resolve: (_input, payload) => {
          queryPayload = payload
          return Array.from(giraffes.values())
        },
      }),

      age: field(silk(new GraphQLNonNull(GraphQLInt)), {
        resolve: (parent, _input, payload) => {
          fieldPayload = payload
          const today = new Date()
          const birthday = new Date(parent.birthday)
          const age = today.getFullYear() - birthday.getFullYear()
          return age
        },
      }),

      saveGiraffe: mutation(silk(Giraffe), {
        input: silk(
          new GraphQLNonNull(
            new GraphQLObjectType<IGiraffe>({
              name: "GiraffeInput",
              fields: {
                name: { type: GraphQLString },
                birthday: { type: GraphQLString },
                heightInMeters: { type: GraphQLFloat },
              },
            })
          )
        ),
        resolve: (input, payload) => {
          mutationPayload = payload
          giraffes.set(input.name, input)
          return input
        },
      }),
    })
    beforeEach(() => {
      giraffes.clear()
      queryPayload = undefined
      mutationPayload = undefined
      fieldPayload = undefined
    })
    const schema = weave(chainResolver)
    describe("mutation", () => {
      it("should work", async () => {
        const query = parse(/* GraphQL */ `
        mutation($name: String!, $birthday: String!, $heightInMeters: Float!) {
          saveGiraffe(
            name: $name,
            birthday: $birthday,
            heightInMeters: $heightInMeters
          ) {
            name
          }
        }
      `)
        const result = await execute({
          schema,
          document: query,
          variableValues: {
            name: "Giraffe",
            birthday: "2020-01-01",
            heightInMeters: 5.5,
          },
        })
        expect(result.data?.saveGiraffe).toEqual({ name: "Giraffe" })
      })

      it("should accept payload", async () => {
        await execute({
          schema,
          document: parse(/* GraphQL */ `
            mutation($name: String!, $birthday: String!, $heightInMeters: Float!) {
              saveGiraffe(
                name: $name,
                birthday: $birthday,
                heightInMeters: $heightInMeters
              ) {
                name
              }
            }
          `),
          variableValues: {
            name: "Giraffe",
            birthday: "2020-01-01",
            heightInMeters: 5.5,
          },
        })
        expect(mutationPayload).toBeDefined()
        expect(mutationPayload?.field["~meta"].operation).toEqual("mutation")
        expect(mutationPayload?.args).toEqual({
          birthday: "2020-01-01",
          heightInMeters: 5.5,
          name: "Giraffe",
        })
        expect(mutationPayload?.context).toEqual(undefined)
        expect(mutationPayload?.info.fieldName).toEqual("saveGiraffe")
        expect(mutationPayload?.root).toEqual(undefined)
      })
    })

    describe("query", () => {
      it("should work", async () => {
        // Add test data
        giraffes.set("Giraffe1", {
          name: "Giraffe1",
          birthday: "2020-01-01",
          heightInMeters: 5.5,
        })
        giraffes.set("Giraffe2", {
          name: "Giraffe2",
          birthday: "2021-01-01",
          heightInMeters: 4.5,
        })

        const query = parse(/* GraphQL */ `
          query {
            giraffes {
              name
              birthday
              heightInMeters
            }
          }
        `)

        const result = await execute({
          schema,
          document: query,
        })

        expect(result.data?.giraffes).toEqual([
          {
            name: "Giraffe1",
            birthday: "2020-01-01",
            heightInMeters: 5.5,
          },
          {
            name: "Giraffe2",
            birthday: "2021-01-01",
            heightInMeters: 4.5,
          },
        ])
      })

      it("should accept payload", async () => {
        // Add test data first
        giraffes.set("Giraffe1", {
          name: "Giraffe1",
          birthday: "2020-01-01",
          heightInMeters: 5.5,
        })
        await execute({
          schema,
          document: parse(/* GraphQL */ `
            query {
              giraffes {
                name
              }
            }
          `),
        })

        expect(queryPayload).toBeDefined()
        expect(queryPayload?.field["~meta"].operation).toEqual("query")
        expect(queryPayload?.args).toEqual({})
        expect(queryPayload?.context).toEqual(undefined)
        expect(queryPayload?.info.fieldName).toEqual("giraffes")
        expect(queryPayload?.root).toEqual(undefined)
      })
    })

    describe("field", () => {
      it("should work", async () => {
        // Add test data
        giraffes.set("Giraffe1", {
          name: "Giraffe1",
          birthday: "2020-01-01",
          heightInMeters: 5.5,
        })

        const query = parse(/* GraphQL */ `
          query {
            giraffes {
              name
              age
            }
          }
        `)

        const result = await execute({
          schema,
          document: query,
        })

        const currentYear = new Date().getFullYear()
        expect((result.data as any)?.giraffes?.[0]?.age).toBe(
          currentYear - 2020
        )
      })

      it("should accept payload", async () => {
        const giraffe = {
          name: "Giraffe1",
          birthday: "2020-01-01",
          heightInMeters: 5.5,
        }
        giraffes.set("Giraffe1", giraffe)
        await execute({
          schema,
          document: parse(/* GraphQL */ `
            query {
              giraffes {
                age
              }
            }
          `),
        })

        expect(fieldPayload).toBeDefined()
        expect(fieldPayload?.field["~meta"].operation).toEqual("field")
        expect(fieldPayload?.args).toEqual({})
        expect(fieldPayload?.context).toEqual(undefined)
        expect(fieldPayload?.info.fieldName).toEqual("age")
        expect(fieldPayload?.root).toEqual(giraffe)
      })
    })
  })
})
