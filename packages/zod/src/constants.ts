import { type ZodStringCheck } from "zod"

export const ZodIDKinds: ZodStringCheck["kind"][] = [
  "cuid",
  "cuid2",
  "ulid",
  "uuid",
]
