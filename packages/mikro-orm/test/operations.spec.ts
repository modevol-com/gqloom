import { silk } from "@gqloom/core"
import { EntitySchema } from "@mikro-orm/core"
import { describe, it } from "vitest"
import { mikroSilk } from "../src"
import { type MikroCreateShuttle } from "../src/operations"
import { GraphQLObjectType } from "graphql"

const emptyFn: any = () => {}

interface IGiraffe {
  id: string
  name: string
  birthday: Date
  height?: number | null
}

const Giraffe = mikroSilk(
  new EntitySchema<IGiraffe>({
    name: "Giraffe",
    properties: {
      id: {
        type: "string",
        primary: true,
      },
      name: {
        type: "string",
      },
      birthday: {
        type: "Date",
      },
      height: {
        type: "number",
        nullable: true,
      },
    },
  })
)

describe("MikroOperationsWeaver", () => {
  describe("MikroCreateShuttle", () => {
    const create: MikroCreateShuttle = emptyFn
    it("should infer Input type", () => {
      create(
        Giraffe,
        silk<Omit<IGiraffe, "height" | "id">>(
          new GraphQLObjectType({ name: "CreateGiraffeInput", fields: {} })
        )
      )
    })
  })
})
