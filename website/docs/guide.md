---
icon: PencilRuler
---
<script setup>
import { GuideFiles } from '@/components/guide-files.tsx'
import { Tabs } from "@/components/tabs.tsx"
</script>

# Guide

To quickly get started with GQLoom, we will build a simple GraphQL backend application together.

We will build a cattery application and provide a GraphQL API to the outside.
This application will include some simple functions:
- Cat basic information management: Enter the basic information of cats, including name, birthday, etc., update, delete and query cats;
- User (cat owner) registration management: Enter user information, a simple login function, and view one's own or other users' cats;

We will use the following technologies:
- [TypeScript](https://www.typescriptlang.org/): As our development language;
- [Node.js](https://nodejs.org/): As the runtime of our application;
- [graphql.js](https://github.com/graphql/graphql-js): The JavaScript implementation of GraphQL;
- [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server): A comprehensive GraphQL HTTP adapter;
- [Drizzle ORM](https://orm.drizzle.team/): A fast and type-safe ORM that helps us operate the database;
- [Valibot](https://valibot.dev/) or [Zod](https://zod.dev/): Used to define and validate inputs;
- `GQLoom`: Allows us to define GraphQL Schema comfortably and efficiently and write resolvers;

## Prerequisites

We only need to install [Node.js](https://nodejs.org/) version 20 or higher to run our application.

## Create the Application

### Project Structure

Our application will have the following structure:
<GuideFiles />

Among them, the functions of each folder or file under the `src` directory are as follows:

- `contexts`: Store contexts, such as the current user;
- `providers`: Store functions that need to interact with external services, such as database connections and Redis connections;
- `resolvers`: Store GraphQL resolvers;
- `schema`: Store the schema, mainly the database table structure;
- `index.ts`: Used to run the GraphQL application in the form of an HTTP service;

:::info
GQLoom has no requirements for the project's file structure. Here is just for reference. In practice, you can organize the files according to your needs and preferences.
:::

### Initialize the Project

First, let's create a new folder and initialize the project:

::: code-group
```sh [npm]
mkdir cattery
cd ./cattery
npm init -y
```

```sh [pnpm]
mkdir cattery
cd ./cattery
pnpm init
```

```sh [yarn]
mkdir cattery
cd ./cattery
yarn init -y
```
:::

Then, we will install some necessary dependencies to run a TypeScript application in Node.js:

::: code-group
```sh [npm]
npm i -D typescript @types/node tsx
npx tsc --init
```

```sh [pnpm]
pnpm add -D typescript @types/node tsx
pnpm exec tsc --init
```

```sh [yarn]
yarn add -D typescript @types/node tsx
yarn dlx -q -p typescript tsc --init
```
:::

Next, we will install GQLoom and related dependencies. We can choose [Valibot](https://valibot.dev/) or [Zod](https://zod.dev/) to define and validate inputs:

::: code-group
```sh [npm]
# use Valibot
npm i graphql graphql-yoga @gqloom/core valibot @gqloom/valibot

# use Zod
npm i graphql graphql-yoga @gqloom/core zod @gqloom/zod
```
```sh [pnpm]
# use Valibot
pnpm add graphql graphql-yoga @gqloom/core valibot @gqloom/valibot

# use Zod
pnpm add graphql graphql-yoga @gqloom/core zod @gqloom/zod
```
```sh [yarn]
# use Valibot
yarn add graphql graphql-yoga @gqloom/core valibot @gqloom/valibot

# use Zod
yarn add graphql graphql-yoga @gqloom/core zod @gqloom/zod
```
:::

### Hello World

Let's write our first [resolver](./resolver),we can choose to use `Valibot` or `Zod`:

<Tabs groupId="input-schema">
<template #valibot>

::: code-group
<<< @/snippets/guide-valibot/src/resolvers/index-0.ts{ts twoslash} [src/resolvers/index.ts]
:::

</template>
<template #zod>

::: code-group
<<< @/snippets/guide-zod/src/resolvers/index-0.ts{ts twoslash} [src/resolvers/index.ts]
:::

</template>
</Tabs>

We need to weave this resolver into a GraphQL Schema and run it as an HTTP server:

<Tabs groupId="input-schema">
<template #valibot>

::: code-group
<<< @/snippets/guide-valibot/src/index-0.ts{ts twoslash} [src/index.ts]
:::

</template>
<template #zod>

::: code-group
<<< @/snippets/guide-zod/src/index-0.ts{ts twoslash} [src/index.ts]
:::

</template>
</Tabs>

Great, we have already created a simple GraphQL application.
Next, let's try to run this application. Add the `dev` script to the `package.json`: 
```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts"
  }
}
```

Now let's run it:

::: code-group
```sh [npm]
npm run dev
```
```sh [pnpm]
pnpm dev
```
```sh [yarn]
yarn dev
```
:::

Open http://localhost:4000/graphql in the browser and you can see the GraphQL playground.
Let's try to send a GraphQL query. Enter the following in the playground:

```gql
{
  hello(name: "GQLoom")
}
```

Click the query button, and you can see the result:

```json
{
  "data": {
    "hello": "Hello GQLoom!"
  }
}
```

So far, we have created the simplest GraphQL application.

Next, we will use Drizzle ORM to interact with the database and add complete functions.

## Initialize the Database and Tables

First, let's install [Drizzle ORM](https://orm.drizzle.team/). We will use it to operate the **SQLite** database.

::: code-group
```sh [npm]
npm i @gqloom/drizzle drizzle-orm @libsql/client dotenv
npm i -D drizzle-kit
```
```sh [pnpm]
pnpm add @gqloom/drizzle drizzle-orm @libsql/client dotenv
pnpm add -D drizzle-kit
```
```sh [yarn]
yarn add @gqloom/drizzle drizzle-orm @libsql/client dotenv
yarn add -D drizzle-kit
```
:::

### Define Database Tables

Next, define the database tables in the `src/schema/index.ts` file. We will define two tables, `users` and `cats`, and establish the relationship between them:

::: code-group
<<< @/snippets/guide-valibot/src/schema/index.ts{ts twoslash} [src/schema/index.ts]
:::

### Initialize the Database

We need to create a configuration file:

::: code-group
<<< @/snippets/guide-valibot/drizzle.config.ts{ts} [drizzle.config.ts]
:::

Then we run the `drizzle-kit push` command to create the defined tables in the database:
```sh
npx drizzle-kit push
```

### Use the Database

To use the database in the application, we need to create a database instance:

::: code-group
<<< @/snippets/guide-valibot/src/providers/index.ts{ts twoslash} [src/providers/index.ts]
:::

## Resolvers

Now, we can use the user service in the resolver. We will create a user resolver and add the following operations:

- `usersByName`: Find users by name
- `userByPhone`: Find users by phone number
- `createUser`: Create a user

After completing the user resolver, we also need to add it to the `resolvers` in the `src/resolvers/index.ts` file:

<Tabs groupId="input-schema">
<template #valibot>

::: code-group
<<< @/snippets/guide-valibot/src/resolvers/user-0.ts{ts twoslash} [src/resolvers/user.ts]

<<< @/snippets/guide-valibot/src/resolvers/index-1.ts{ts twoslash} [src/resolvers/index.ts]
:::

</template>
<template #zod>

::: code-group
<<< @/snippets/guide-zod/src/resolvers/user-0.ts{ts twoslash} [src/resolvers/user.ts]

<<< @/snippets/guide-zod/src/resolvers/index-1.ts{ts twoslash} [src/resolvers/index.ts]
:::

</template>
</Tabs>

Great, now let's try it in the playground:

::: code-group
```gql [GraphQL Mutation]
mutation {
  createUser(data: {name: "Bob", phone: "001"}) {
    id
    name
    phone
  }
}
```

```json [Response.json]
{
  "data": {
    "createUser": {
      "id": 1,
      "name": "Bob",
      "phone": "001"
    }
  }
}
```
:::

Let's continue to try to retrieve the user we just created:

::: code-group
```gql [GraphQL Query]
{
  usersByName(name: "Bob") {
    id
    name
    phone
  }
}
```

```json [Response.json]
{
  "data": {
    "usersByName": [
      {
        "id": 1,
        "name": "Bob",
        "phone": "001"
      }
    ]
  }
}
```
:::

### Current User Context

First, let's add the `asyncContextProvider` middleware to enable asynchronous context: 

<Tabs groupId="input-schema">
<template #valibot>

::: code-group
<<< @/snippets/guide-valibot/src/index.ts{ts twoslash} [src/index.ts]
:::

</template>
<template #zod>

::: code-group
<<< @/snippets/guide-zod/src/index.ts{ts twoslash} [src/index.ts]
:::

</template>
</Tabs>

Next, let's try to add a simple login function and add a query operation to the user resolver:

- `mine`: Return the current user information

To implement this query, we first need to have a login function. Let's write a simple one:

<Tabs groupId="input-schema">
<template #valibot>

::: code-group
<<< @/snippets/guide-valibot/src/contexts/index.ts{ts twoslash} [src/contexts/index.ts]
:::

</template>
<template #zod>

::: code-group
<<< @/snippets/guide-zod/src/contexts/index.ts{ts twoslash} [src/contexts/index.ts]
:::

</template>
</Tabs>

In the above code, we created a [context](./context) function for getting the current user, which will return the information of the current user. We use `createMemoization()` to memoize this function, which ensures that this function is only executed once within the same request to avoid unnecessary database queries.

We used `useContext()` to get the context provided by Yoga, and obtained the user's phone number from the request header, and found the user according to the phone number. If the user does not exist, a `GraphQLError` will be thrown.

::: warning
As you can see, this login function is very simple and is only used for demonstration purposes, and it does not guarantee security at all. In practice, it is usually recommended to use solutions such as `session` or `jwt`.
:::

Now, we add the new query operation in the resolver:

<Tabs groupId="input-schema">
<template #valibot>

::: code-group
<<< @/snippets/guide-valibot/src/resolvers/user-1.ts{ts twoslash} [src/resolvers/user.ts]
:::

</template>
<template #zod>

::: code-group
<<< @/snippets/guide-zod/src/resolvers/user-1.ts{ts twoslash} [src/resolvers/user.ts]
:::

</template>
</Tabs>

If we directly call this new query in the playground, the application will give us an unauthorized error:

::: code-group
```gql [GraphQL Query]
{
  mine {
    id
    name
    phone
  }
}
```
```json [Response.json]
{
  "errors": [
    {
      "message": "Unauthorized",
      "locations": [
        {
          "line": 2,
          "column": 3
        }
      ],
      "path": [
        "mine"
      ]
    }
  ],
  "data": null
}
```
:::

Open the `Headers` at the bottom of the playground and add the `authorization` field to the request header. Here we use the phone number of `Bob` created in the previous step, so we are logged in as `Bob`:

::: code-group
```json [Headers]
{
  "authorization": "001"
}
```

```gql [GraphQL Query]
{
  mine {
    id
    name
    phone
  }
}
```

```json [Response.json]
{
  "data": {
    "mine": {
      "id": 1,
      "name": "Bob",
      "phone": "001"
    }
  }
}
```
:::

### Resolver Factory

Next, we will add the business logic related to cats.

We use the [resolver factory](./schema/drizzle#resolver-factory) to quickly create interfaces:

<Tabs groupId="input-schema">
<template #valibot>

::: code-group
<<< @/snippets/guide-valibot/src/resolvers/cat-0.ts{ts twoslash} [src/resolvers/cat.ts]
<<< @/snippets/guide-valibot/src/resolvers/index.ts{ts twoslash} [src/resolvers/index.ts]
:::

</template>
<template #zod>

::: code-group
<<< @/snippets/guide-zod/src/resolvers/cat-0.ts{ts twoslash} [src/resolvers/cat.ts]
<<< @/snippets/guide-zod/src/resolvers/index.ts{ts twoslash} [src/resolvers/index.ts]
:::

</template>
</Tabs>

In the above code, we used `drizzleResolverFactory()` to create `catResolverFactory` for quickly building resolvers.

We added a query that uses `catResolverFactory` to select data and named it `cats`. This query will provide full query operations on the `cats` table.
In addition, we also added an additional `age` field for cats to get the age of the cats.

Next, let's try to add a `createCat` mutation. We want only logged-in users to access this interface, and the created cats will belong to the current user:

<Tabs groupId="input-schema">
<template #valibot>

::: code-group
<<< @/snippets/guide-valibot/src/resolvers/cat-1.ts{24-45 ts twoslash} [src/resolvers/cat.ts]
:::

</template>
<template #zod>

::: code-group
<<< @/snippets/guide-zod/src/resolvers/cat-1.ts{26-40 ts twoslash} [src/resolvers/cat.ts]
:::

</template>
</Tabs>

In the above code, we used `catResolverFactory` to create a mutation that adds more data to the `cats` table, and we overwrote the input of this mutation. When validating the input, we used `useCurrentUser()` to get the ID of the currently logged-in user and pass it as the value of `ownerId` to the `cats` table.

Now let's try to add a few cats in the playground:

::: code-group
```gql [GraphQL Mutation]
mutation {
  createCats(values: [{ name: "Mittens", birthday: "2021-01-01" }, { name: "Fluffy", birthday: "2022-02-02" }]) {
    id
    name
    age
  }
}
```

```json [Headers]
{
  "authorization": "001"
}
```

```json [Response.json]
{
  "data": {
    "createCats": [
      {
        "id": 1,
        "name": "Mittens",
        "age": 4
      },
      {
        "id": 2,
        "name": "Fluffy",
        "age": 3
      }
    ]
  }
}
```
:::

Let's use the `cats` query to confirm the data in the database again:

::: code-group
```gql [GraphQL Query]
{
  cats {
    id
    name   
    age
  }
}
```

```json [Response.json]
{
  "data": {
    "cats": [
      {
        "id": 1,
        "name": "Mittens",
        "age": 4
      },
      {
        "id": 2,
        "name": "Fluffy",
        "age": 3
      }
    ]
  }
}
```
:::

### Associated Objects

We want to be able to get the owner of a cat when querying the cat, and also be able to get all the cats of a user when querying the user.
This is very easy to achieve in GraphQL.
Let's add an additional `owner` field to `cats` and an additional `cats` field to `users`:

<Tabs groupId="input-schema">
<template #valibot>

::: code-group
<<< @/snippets/guide-valibot/src/resolvers/cat.ts{ts twoslash} [src/resolvers/cat.ts]
<<< @/snippets/guide-valibot/src/resolvers/user.ts{ts twoslash} [src/resolvers/user.ts]
:::

</template>
<template #zod>

::: code-group
<<< @/snippets/guide-zod/src/resolvers/cat.ts{ts twoslash} [src/resolvers/cat.ts]
<<< @/snippets/guide-zod/src/resolvers/user.ts{ts twoslash} [src/resolvers/user.ts]
:::

</template>
</Tabs>

In the above code, we used the resolver factory to create the `owner` field for `cats`; similarly, we also created the `cats` field for `users`.
Behind the scenes, the relationship fields created by the resolver factory will use `DataLoader` to query from the database to avoid the N+1 problem.

Let's try to query the owner of a cat in the playground:

::: code-group
```gql [GraphQL Query]
{
  cats {
    id
    name
    age
    owner {
      id
      name
      phone
    }
  }
}
```

```json [Response.json]
{
  "data": {
    "cats": [
      {
        "id": 1,
        "name": "Mittens",
        "age": 4,
        "owner": {
          "id": 1,
          "name": "Bob",
          "phone": "001"
        }
      },
      {
        "id": 2,
        "name": "Fluffy",
        "age": 3,
        "owner": {
          "id": 1,
          "name": "Bob",
          "phone": "001"
        }
      }
    ]
  }
}
```
:::

Let's try to query the cats of the current user:

::: code-group
```gql [GraphQL Query]
{
  mine {
    name
    cats {
      id
      name
      age
    }
  }
}
```

```json [Headers]
{
  "authorization": "001"
}
```

```json [Response.json]
{
  "data": {
    "mine": {
      "name": "Bob",
      "cats": [
        {
          "id": 1,
          "name": "Mittens",
          "age": 4
        },
        {
          "id": 2,
          "name": "Fluffy",
          "age": 3
        }
      ]
    }
  }
}
```
:::

## Conclusion

In this article, we created a simple GraphQL server-side application. We used the following tools:

- `Valibot` or `Zod`: Used to define and validate inputs;
- `Drizzle`: Used to operate the database, and directly use the `Drizzle` table as the `GraphQL` output type;
- Context: Used to share data between different parts of the program, which is very useful for scenarios such as implementing login and tracking logs;
- Resolver factory: Used to quickly create resolvers and operations;
- `GraphQL Yoga`: Used to create a GraphQL HTTP service and provides a GraphiQL playground;

Our application has implemented the functions of adding and querying `users` and `cats`, but due to space limitations, the update and delete functions have not been implemented. They can be quickly added through the resolver factory.

## Next Steps

- Check out the core concepts of GQLoom: [Silk](./silk), [Resolver](./resolver), [Weave](./weave);
- Learn about common functions: [Context](./context), [DataLoader](./dataloader), [Middleware](./middleware)
- Add a GraphQL client to the front-end project: [gql.tada](https://gql-tada.0no.co/), [Urql](https://commerce.nearform.com/open-source/urql/), [Apollo Client](https://www.apollographql.com/docs/react), [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/graphql), [Graffle](https://graffle.js.org/)