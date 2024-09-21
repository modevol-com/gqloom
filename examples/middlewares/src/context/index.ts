import { createMemoization } from "@gqloom/core"

const users: User[] = [
  {
    id: 1,
    name: "John",
    roles: ["admin"],
  },
  {
    id: 2,
    name: "Jane",
    roles: ["editor"],
  },
  {
    id: 3,
    name: "Bob",
    roles: [],
  },
]

export const useUser = createMemoization(async () => {
  const randomUser = users[Math.floor(Math.random() * users.length)]
  return randomUser
})

export interface User {
  id: number
  name: string
  roles: ("admin" | "editor")[]
}
