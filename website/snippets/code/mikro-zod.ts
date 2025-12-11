import { silk } from "@gqloom/core"
import { mikroSilk } from "@gqloom/mikro-orm"
import { asEnumType } from "@gqloom/zod"
import { defineEntity, type InferEntity, p } from "@mikro-orm/core"
import * as z from "zod"

const Role = z.enum(["admin", "user"]).register(asEnumType, {
  valuesConfig: {
    admin: { description: "Admin user" },
    user: { description: "Regular user" },
  },
})

const ContactInformation = z.object({
  email: z.string().nullish(),
  phone: z.string().nullish(),
  address: z.string().nullish(),
})

const UserEntity = defineEntity({
  name: "User",
  properties: {
    id: p.integer().primary().autoincrement(),
    createdAt: p.datetime().onCreate(() => new Date()),
    name: p.string(),
    role: p.enum(Role.options).onCreate(() => "user"),
    contactInformation: p.json<z.infer<typeof ContactInformation>>().nullable(),
  },
})

export interface IUser extends InferEntity<typeof UserEntity> {}
export const User = mikroSilk(UserEntity, {
  fields: () => ({
    role: { type: silk.getType(Role) }, // [!code highlight]
    contactInformation: { type: silk.getType(z.nullish(ContactInformation)) }, // [!code highlight]
  }),
})
