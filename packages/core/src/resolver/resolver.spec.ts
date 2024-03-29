import {
  GraphQLFloat,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from "graphql"
import { test } from "vitest"
import { fabric } from "./fabric"
import {
  fabricField as field,
  fabricMutation as mutation,
  fabricQuery as query,
  fabricResolver as resolver,
} from "./resolver"

test("base resolver", () => {
  interface IGiraffe {
    name: string
    birthday: Date
    heightInMeters: number
  }

  const Giraffe = fabric<IGiraffe>(
    new GraphQLObjectType({
      name: "Giraffe",
      fields: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        birthday: { type: new GraphQLNonNull(GraphQLString) },
        heightInMeters: { type: new GraphQLNonNull(GraphQLFloat) },
      },
    })
  )

  const GiraffeInput = fabric<Partial<IGiraffe>>(
    new GraphQLObjectType({
      name: "GiraffeInput",
      fields: {
        name: { type: GraphQLString },
        birthday: { type: GraphQLString },
        heightInMeters: { type: GraphQLFloat },
      },
    })
  )

  const createGiraffe = mutation(Giraffe, {
    input: GiraffeInput,
    resolve: (data) => ({
      name: data.name ?? "Giraffe",
      birthday: data.birthday ?? new Date(),
      heightInMeters: data.heightInMeters ?? 5,
    }),
  })

  const simpleGiraffeResolver = resolver({
    createGiraffe,
  })

  const giraffeResolver = resolver.of(Giraffe, {
    age: field(fabric<number>(GraphQLInt), async (giraffe) => {
      return new Date().getFullYear() - giraffe.birthday.getFullYear()
    }),

    giraffe: query(Giraffe, {
      input: { name: fabric<string>(GraphQLString) },
      resolve: ({ name }) => ({
        name,
        birthday: new Date(),
        heightInMeters: 5,
      }),
    }),

    greeting: field(fabric<string>(GraphQLString), {
      input: { myName: fabric<string | undefined>(GraphQLString) },
      resolve: (giraffe, { myName }) =>
        `Hello, ${myName ?? "my friend"}! My name is ${giraffe.name}.`,
    }),

    createGiraffe: mutation(Giraffe, {
      input: GiraffeInput,
      resolve: (data) => ({
        name: data.name ?? "Giraffe",
        birthday: data.birthday ?? new Date(),
        heightInMeters: data.heightInMeters ?? 5,
      }),
    }),
  })

  const giraffe: IGiraffe = {
    name: "Giraffe",
    birthday: new Date(),
    heightInMeters: 5,
  }
  giraffeResolver.giraffe.resolve({ name: "Giraffe" })
  giraffeResolver.age.resolve(giraffe, { name: "Giraffe" })
  simpleGiraffeResolver.createGiraffe.resolve({})
})
