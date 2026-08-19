import { silk } from "@gqloom/core"
import { drizzleSilk } from "@gqloom/drizzle"
import { asEnumType } from "@gqloom/zod"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
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

export const users = drizzleSilk(
  sqliteTable("users", {
    id: integer().primaryKey({ autoIncrement: true }),
    createdAt: integer({ mode: "timestamp" }).$default(() => new Date()),
    name: text().notNull(),
    role: text({ enum: Role.options as ["admin", "user"] }).default("user"),
    contactInformation: text({ mode: "json" }).$type<
      z.infer<typeof ContactInformation>
    >(),
  }),
  {
    fields: () => ({
      role: { type: silk.getType(Role) },
      contactInformation: { type: silk.getType(z.nullish(ContactInformation)) },
    }),
  }
)
