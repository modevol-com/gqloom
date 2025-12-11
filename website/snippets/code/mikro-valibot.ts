import { silk } from "@gqloom/core"
import { mikroSilk } from "@gqloom/mikro-orm"
import { asEnumType } from "@gqloom/valibot"
import { defineEntity, type InferEntity, p } from "@mikro-orm/core"
import * as v from "valibot"

const Role = v.pipe(
  v.picklist(["admin", "user"]),
  asEnumType({
    name: "Role",
    valuesConfig: {
      admin: { description: "Admin user" },
      user: { description: "Regular user" },
    },
  })
)

const ContactInformation = v.object({
  email: v.nullish(v.string()),
  phone: v.nullish(v.string()),
  address: v.nullish(v.string()),
})

const UserEntity = defineEntity({
  name: "User",
  properties: {
    id: p.integer().primary().autoincrement(),
    createdAt: p.datetime().onCreate(() => new Date()),
    name: p.string(),
    role: p.enum(Role.options).onCreate(() => "user"),
    contactInformation: p
      .json<v.InferOutput<typeof ContactInformation>>()
      .nullable(),
  },
})

export interface IUser extends InferEntity<typeof UserEntity> {}
export const User = mikroSilk(UserEntity, {
  fields: () => ({
    role: { type: silk.getType(Role) }, // [!code highlight]
    contactInformation: { type: silk.getType(v.nullish(ContactInformation)) }, // [!code highlight]
  }),
})
