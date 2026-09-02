import crypto from "node:crypto"
import { field, mutation, query, resolver, weave } from "@gqloom/core"
import { ZodWeaver, asObjectType } from "@gqloom/zod"
import { GraphQLDateTimeISO } from "graphql-scalars"
import { lexicographicSortSchema, printSchema } from "graphql"
import * as z from "zod"

const zodWeaverConfig = ZodWeaver.config({
  presetGraphQLType: (schema) => {
    if (schema instanceof z.ZodDate) return GraphQLDateTimeISO
  },
})

// Flattened from TypeGraphQL class inheritance (Person → Student/Employee).
const personOutputFields = {
  id: z.string().describe("Unique identifier"),
  name: z.string(),
  age: z.int(),
}

function avatarField() {
  return field(z.string())
    .input({ size: z.number() })
    .resolve((_parent, { size }) => `http://i.pravatar.cc/${size}`)
}

// --- Interfaces (asObjectType last line of defense for `interfaces`) ---

const IResource = z.object({
  __typename: z.literal("IResource").nullish(),
  id: z.string().describe("Resource identifier"),
})

const IPerson = z
  .object({
    __typename: z.literal("IPerson").nullish(),
    ...personOutputFields,
  })
  .describe("A person in the registry")
  .register(asObjectType, { interfaces: [IResource] })

// --- Object types: Zod composition + asObjectType({ interfaces }) ---

const Person = z
  .object({
    __typename: z.literal("Person"),
    ...personOutputFields,
  })
  .register(asObjectType, { interfaces: [IPerson] })

const Student = z
  .object({
    __typename: z.literal("Student"),
    ...personOutputFields,
    universityName: z.string(),
  })
  .register(asObjectType, { interfaces: [IPerson] })

const Employee = z
  .object({
    __typename: z.literal("Employee"),
    ...personOutputFields,
    companyName: z.string(),
  })
  .register(asObjectType, { interfaces: [IPerson] })

// DOC_GAP: query([IPerson!]!) + concrete types with `interfaces: [IPerson]` in the
// same weave duplicates the IPerson GraphQL type. Workaround: discriminated union
// for the polymorphic list (documented union pattern in zod.md).
const Persons = z.discriminatedUnion("__typename", [Student, Employee])

// --- Input silks (separate from outputs; .extend flattens PersonInput inheritance) ---

const PersonInput = z
  .object({
    name: z.string(),
    dateOfBirth: z.date(),
  })
  .meta({ title: "PersonInput" })

const StudentInput = PersonInput.extend({
  universityName: z.string(),
}).meta({ title: "StudentInput" })

const EmployeeInput = PersonInput.extend({
  companyName: z.string(),
}).meta({ title: "EmployeeInput" })

type IPersonValue = z.infer<typeof Student> | z.infer<typeof Employee>

function getId(): string {
  const randomNumber = Math.random()
  const hash = crypto.createHash("sha256")
  hash.update(randomNumber.toString())
  return hash.digest("hex")
}

function calculateAge(birthday: Date): number {
  const ageDiffMs = Date.now() - birthday.getTime()
  const ageDate = new Date(ageDiffMs)
  return Math.abs(ageDate.getUTCFullYear() - 1970)
}

const personsRegistry: IPersonValue[] = []

const multiResolver = resolver({
  persons: query(z.array(Persons)).resolve(() => personsRegistry),

  addStudent: mutation(Student)
    .input({ input: StudentInput })
    .resolve(({ input }) => {
      const student: z.infer<typeof Student> = {
        __typename: "Student",
        id: getId(),
        name: input.name,
        universityName: input.universityName,
        age: calculateAge(input.dateOfBirth),
      }
      personsRegistry.push(student)
      return student
    }),

  addEmployee: mutation(Employee)
    .input({ input: EmployeeInput })
    .resolve(({ input }) => {
      const employee: z.infer<typeof Employee> = {
        __typename: "Employee",
        id: getId(),
        name: input.name,
        companyName: input.companyName,
        age: calculateAge(input.dateOfBirth),
      }
      personsRegistry.push(employee)
      return employee
    }),
})

const studentResolver = resolver.of(Student, { avatar: avatarField() })
const employeeResolver = resolver.of(Employee, { avatar: avatarField() })
const personResolver = resolver.of(Person, { avatar: avatarField() })

export const schema = weave(
  ZodWeaver,
  zodWeaverConfig,
  multiResolver,
  studentResolver,
  employeeResolver,
  personResolver,
  // orphanedTypes equivalent: Person is not referenced by operations
  Person,
)

export const sdl = printSchema(lexicographicSortSchema(schema))

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(sdl)
}
