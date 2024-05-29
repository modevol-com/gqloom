import { describe, expect, it } from "vitest"
import {
  type GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLString,
} from "graphql"
import {
  gqloomExtensions,
  directives,
  type GQLoomExtensions,
} from "./extensions"
import { SchemaWeaver } from "./schema-weaver"
import { loom, silk } from "../resolver"
import { ensureInterfaceType } from "./interface"

declare module "graphql" {
  export interface GraphQLObjectTypeExtensions extends GQLoomExtensions {}

  export interface GraphQLFieldExtensions<_TSource, _TContext, _TArgs = any>
    extends GQLoomExtensions {}
}

describe("directive", () => {
  interface IAnimal {
    color?: string
  }

  const Animal = new GraphQLObjectType({
    name: "Animal",
    fields: {
      color: { type: GraphQLString },
    },
    extensions: { gqloom: { directives: ['@loom(value: "woo")'] } },
  })

  const Cat = new GraphQLObjectType({
    name: "Cat",
    fields: {
      color: {
        type: GraphQLString,
        extensions: { gqloom: { directives: ['@loom(value: "woo")'] } },
      },
    },
    interfaces: [Animal].map((it) => ensureInterfaceType(it)),
    extensions: directives('@loom(value: "woo")'),
  })

  const CatInput = new GraphQLObjectType({
    name: "CatInput",
    fields: {
      color: {
        type: GraphQLString,
        extensions: { gqloom: { directives: ['@loom(value: "woo")'] } },
      },
    },
    extensions: gqloomExtensions({ directives: ['@loom(value: "woo")'] }),
  })

  interface IFruit {
    color?: string
  }

  const Fruit = new GraphQLInterfaceType({
    name: "Fruit",
    fields: { color: { type: GraphQLString } },
  })

  const Grape = new GraphQLObjectType({
    name: "Grape",
    fields: { color: { type: GraphQLString } },
    interfaces: [Fruit].map((it) => ensureInterfaceType(it)),
  })

  const GrapeInput = new GraphQLObjectType({
    name: "GrapeInput",
    fields: { color: { type: GraphQLString } },
  })

  const r = loom.resolver({
    grape: loom.query(silk<IFruit>(Grape), {
      input: { data: silk<IFruit>(GrapeInput) },
      resolve: ({ data }) => data,
    }),
    cat: loom.query(silk<IAnimal>(Cat), {
      input: { data: silk<IAnimal>(CatInput) },
      resolve: ({ data }) => data,
    }),
  })

  const schema = new SchemaWeaver().add(r).weaveGraphQLSchema()

  it("should work with object", () => {
    expect(schema.getType("Grape")?.astNode).not.toBeDefined()
    expect(schema.getType("Cat")?.astNode).toBeDefined()
  })

  it("should work with field", () => {
    const GrapeO = schema.getType("Grape") as GraphQLObjectType
    expect(GrapeO.getFields()["color"].astNode).not.toBeDefined()

    const CatO = schema.getType("Cat") as GraphQLObjectType
    expect(CatO.getFields()["color"].astNode).toBeDefined()
  })

  it("should work with interface", () => {
    const FruitI = schema.getType("Fruit") as GraphQLInterfaceType
    expect(FruitI.astNode).not.toBeDefined()

    const AnimalI = schema.getType("Animal") as GraphQLInterfaceType
    expect(AnimalI.astNode).toBeDefined()
  })

  it("should work with input object", () => {
    expect(schema.getType("GrapeInput")?.astNode).not.toBeDefined()
    expect(schema.getType("CatInput")?.astNode).toBeDefined()
  })

  it("should work with input value", () => {
    const GrapeI = schema.getType("GrapeInput") as GraphQLInputObjectType
    expect(GrapeI.getFields()["color"].astNode).not.toBeDefined()

    const CatI = schema.getType("CatInput") as GraphQLInputObjectType
    expect(CatI.getFields()["color"].astNode).toBeDefined()
  })
})