import {
  GraphQLFloat,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from "graphql"
import { beforeEach, describe, expect, test } from "vitest"
import "./resolver"
import { applyMiddlewares } from "../utils"
import { createInputParser } from "./input"
import {
  FieldFactoryWithResolve,
  MutationFactoryWithResolve,
  QueryFactoryWithResolve,
} from "./resolver-chain-factory"
import { silk } from "./silk"

interface IGiraffe {
  name: string
  birthday: Date
  heightInMeters: number
}

const Giraffe = silk<IGiraffe, IGiraffe>(
  new GraphQLNonNull(
    new GraphQLObjectType<IGiraffe>({
      name: "Giraffe",
      fields: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        birthday: { type: new GraphQLNonNull(GraphQLString) },
        heightInMeters: { type: new GraphQLNonNull(GraphQLFloat) },
      },
    })
  )
)

const GiraffeInput = silk<Partial<IGiraffe>>(
  new GraphQLObjectType({
    name: "GiraffeInput",
    fields: {
      name: { type: GraphQLString },
      birthday: { type: GraphQLString },
      heightInMeters: { type: GraphQLFloat },
    },
  })
)

// QueryFactoryWithResolve

describe("QueryFactoryWithResolve", () => {
  let Skyler: IGiraffe
  beforeEach(() => {
    Skyler = {
      name: "Skyler",
      birthday: new Date("2020-01-01"),
      heightInMeters: 5,
    }
  })

  test("input() should set input type", () => {
    const q = new QueryFactoryWithResolve(Giraffe, {
      resolve: () => Skyler,
    })
    const q2 = q.input(GiraffeInput)
    expect(q2["~meta"].input).toBe(GiraffeInput)
  })

  test("output() should set output type and transform", async () => {
    const q = new QueryFactoryWithResolve(Giraffe, {
      resolve: () => Skyler,
    })
    const q2 = q.output(silk(GraphQLString), (g) => g.name)
    const result = await applyMiddlewares(
      {
        outputSilk: q2["~meta"].output,
        parent: undefined,
        payload: undefined,
        parseInput: createInputParser(q2["~meta"].input, undefined),
        operation: "query",
      },
      () => q2["~meta"].resolve(undefined, undefined),
      q2["~meta"].middlewares ?? []
    )
    expect(result).toBe("Skyler")
    expect(silk.getType(q2["~meta"].output)).toEqual(
      silk.getType(silk(GraphQLString))
    )
  })

  test("description, deprecationReason, extensions", () => {
    const q = new QueryFactoryWithResolve(Giraffe, {
      resolve: () => Skyler,
    })
      .description("desc")
      .deprecationReason("deprecated")
      .extensions({ foo: "bar" })
    expect(q["~meta"].description).toBe("desc")
    expect(q["~meta"].deprecationReason).toBe("deprecated")
    expect(q["~meta"].extensions).toEqual({ foo: "bar" })
  })
})

describe("MutationFactoryWithResolve", () => {
  let Skyler: IGiraffe
  beforeEach(() => {
    Skyler = {
      name: "Skyler",
      birthday: new Date("2020-01-01"),
      heightInMeters: 5,
    }
  })

  test("input() should set input type", () => {
    const m = new MutationFactoryWithResolve(Giraffe, {
      resolve: () => Skyler,
    })
    const m2 = m.input(GiraffeInput)
    expect(m2["~meta"].input).toBe(GiraffeInput)
  })

  test("output() should set output type and transform", async () => {
    const m = new MutationFactoryWithResolve(Giraffe, {
      resolve: () => Skyler,
    })
    const m2 = m.output(silk(GraphQLString), (g) => g.name)
    const result = await applyMiddlewares(
      {
        outputSilk: m2["~meta"].output,
        parent: undefined,
        payload: undefined,
        parseInput: createInputParser(m2["~meta"].input, undefined),
        operation: "mutation",
      },
      () => m2["~meta"].resolve(undefined, undefined),
      m2["~meta"].middlewares ?? []
    )
    expect(result).toBe("Skyler")
    expect(silk.getType(m2["~meta"].output)).toEqual(
      silk.getType(silk(GraphQLString))
    )
  })

  test("description, deprecationReason, extensions", () => {
    const m = new MutationFactoryWithResolve(Giraffe, {
      resolve: () => Skyler,
    })
      .description("desc")
      .deprecationReason("deprecated")
      .extensions({ foo: "bar" })
    expect(m["~meta"].description).toBe("desc")
    expect(m["~meta"].deprecationReason).toBe("deprecated")
    expect(m["~meta"].extensions).toEqual({ foo: "bar" })
  })
})

describe("FieldFactoryWithResolve", () => {
  let Skyler: IGiraffe
  beforeEach(() => {
    Skyler = {
      name: "Skyler",
      birthday: new Date("2020-01-01"),
      heightInMeters: 5,
    }
  })

  test("output() should set output type and transform", async () => {
    const f = new FieldFactoryWithResolve(Giraffe, {
      resolve: () => Skyler,
    })
    const f2 = f.output(silk(GraphQLString), (g) => g.name)
    const result = await applyMiddlewares(
      {
        outputSilk: f2["~meta"].output,
        parent: undefined,
        payload: undefined,
        parseInput: createInputParser(f2["~meta"].input, undefined),
        operation: "field",
      },
      () => f2["~meta"].resolve(undefined, undefined, undefined),
      f2["~meta"].middlewares ?? []
    )
    expect(result).toBe("Skyler")
    expect(silk.getType(f2["~meta"].output)).toEqual(
      silk.getType(silk(GraphQLString))
    )
  })

  test("description, deprecationReason, extensions", () => {
    const f = new FieldFactoryWithResolve(Giraffe, {
      resolve: () => Skyler,
    })
      .description("desc")
      .deprecationReason("deprecated")
      .extensions({ foo: "bar" })
    expect(f["~meta"].description).toBe("desc")
    expect(f["~meta"].deprecationReason).toBe("deprecated")
    expect(f["~meta"].extensions).toEqual({ foo: "bar" })
  })

  test("FieldFactoryWithResolve", () => {
    const field = new FieldFactoryWithResolve(silk(GraphQLString), {
      resolve: () => "test",
    })
    expect(field).toBeDefined()
    expect(field["~meta"].resolve).toBeDefined()
  })
})
