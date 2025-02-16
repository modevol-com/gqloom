import type { Metadata } from "next"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

export const metadata: Metadata = {
  title: "GQLoom",
  description:
    "GQLoom is a Code First GraphQL Schema Loom, used to weave runtime types in the TypeScript/JavaScript ecosystem into a GraphQL Schema.",
  icons: {
    icon: { url: "/gqloom.svg", type: "image/svg+xml" },
  },
}
