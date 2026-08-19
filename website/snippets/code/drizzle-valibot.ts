import { silk } from "@gqloom/core"
import { drizzleSilk } from "@gqloom/drizzle"
import { asEnumType } from "@gqloom/valibot"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
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

export const users = drizzleSilk(
  sqliteTable("users", {
    id: integer().primaryKey({ autoIncrement: true }),
    createdAt: integer({ mode: "timestamp" }).$default(() => new Date()),
    name: text().notNull(),
    role: text({ enum: Role.options }).default("user"),
    contactInformation: text({ mode: "json" }).$type<
      v.InferOutput<typeof ContactInformation>
    >(),
  }),
  {
    fields: () => ({
      role: { type: silk.getType(Role) },
      contactInformation: { type: silk.getType(v.nullish(ContactInformation)) },
    }),
  }
)
