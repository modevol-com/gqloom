import type { FeatureProps } from "./feature-card"
import type { IHighlight } from "./highlight"

export const highlights: IHighlight[] = [
  {
    emoji: "🧩",
    heading: "Rich Integration",
    text: "Use your most familiar validation libraries and ORMs to build your next GraphQL application.",
  },
  {
    emoji: "🔒",
    heading: "Type Safety",
    text: "Automatically infer types from the Schema, enjoy intelligent code completion during development, and detect potential problems during compilation.",
  },
  {
    emoji: "🔋",
    heading: "Fully Prepared",
    text: "Middleware, context, subscriptions, and federated graphs are ready.",
  },
  {
    emoji: "🔮",
    heading: "No Magic",
    text: "Without decorators, metadata, reflection, or code generation, it can run anywhere with just JavaScript/TypeScript.",
  },
  {
    emoji: "🧑‍💻",
    heading: "Development Experience",
    text: "Fewer boilerplate codes, semantic API design, and extensive ecosystem integration make development enjoyable.",
  },
]

export const features: FeatureProps[] = [
  {
    icon: "lucide:radio-tower",
    title: "Resolver",
    description:
      "Resolvers are the core components of GraphQL. You can define query, mutation, and subscription operations within them, and also dynamically add additional fields to objects for flexible data processing.",
    to: "./docs/resolver",
  },
  {
    icon: "lucide:shuffle",
    title: "Context",
    description:
      "With the context mechanism, you can conveniently inject data anywhere in the application, ensuring efficient data flow between different components and layers.",
    to: "./docs/context",
  },
  {
    icon: "lucide:fence",
    title: "Middleware",
    description:
      "Adopting the concept of aspect - oriented programming, middleware allows you to seamlessly integrate additional logic during the resolution process, such as error handling, user permission verification, and log tracking, enhancing the robustness and maintainability of the system.",
    to: "./docs/middleware",
  },
  {
    icon: "lucide:hard-drive-download",
    title: "Dataloader",
    description:
      "Dataloader is a powerful tool for optimizing performance. It can fetch data in batches, significantly reducing the number of database queries, effectively improving system performance, and making the code structure clearer and easier to maintain.",
    to: "./docs/dataloader",
  },
  {
    icon: "lucide:satellite-dish",
    title: "Subscription",
    description:
      "The subscription feature provides clients with the ability to obtain real - time data updates without manual polling, ensuring that clients always stay in sync with server data and enhancing the user experience.",
    to: "./docs/advanced/subscription",
  },
  {
    icon: "lucide:satellite",
    title: "Federation",
    description:
      "Federation is a microservice - based GraphQL architecture that can easily aggregate multiple services to enable cross - service queries, allowing you to manage complex distributed systems as if operating on a single graph.",
    to: "./docs/advanced/federation",
  },
]

export const gqlHighlights: IHighlight[] = [
  {
    emoji: "🔐",
    heading: "Type Safety",
    text: "Strong type system to ensure the consistency and security of data from the server to the client.",
  },
  {
    emoji: "🧩",
    heading: "Flexible Aggregation",
    text: "Automatically aggregate multiple queries, reducing the number of client requests and ensuring the simplicity of the server-side API.",
  },
  {
    emoji: "🚀",
    heading: "Efficient Querying",
    text: "The client can specify the required data structure, reducing unnecessary data transfer and improving the performance and maintainability of the API.",
  },
  {
    emoji: "🔌",
    heading: "Easy to Extend",
    text: "Extending the API by adding new fields and types without modifying existing code.",
  },
  {
    emoji: "👥",
    heading: "Efficient Collaboration",
    text: "Using Schema as documentation, which can reduce communication costs and improve development efficiency in team development.",
  },
  {
    emoji: "🌳",
    heading: "Thriving Ecosystem",
    text: "Tools and frameworks are emerging constantly. The active community, with diverse applications, is growing fast and has bright prospects.",
  },
]

export const ormIntro = {
  title: "CRUD interfaces are ready for activation",
  descriptions: [
    "Like a skilled weaver, embed precisely defined database tables seamlessly into the GraphQL Schema.",
    "With just a few lines of code, easily build a CRUD system and enjoy ORM's convenience.",
    "Both resolvers and single operations can be customized with inputs and middleware to meet diverse needs.",
    "Using a flexible approach, freely combine resolvers and add operations to the graph for endless potential.",
  ],
}
