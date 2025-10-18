# Data Loaders

Due to the flexibility of GraphQL, when loading related objects of a certain object, we often need to execute multiple queries.
This leads to the notorious N+1 query problem. To solve this, we can use [DataLoader](https://github.com/graphql/dataloader).

`DataLoader` can merge multiple requests into a single one, thereby reducing the number of database queries, and also caching query results to avoid redundant queries.

## The N+1 Query Problem

Consider a scenario where we need to query all users and their respective posts. Our data table structure is as follows:

<<< @/snippets/dataloader/src/schema.ts{ts twoslash}

A straightforward resolver implementation might look like this:

<<< @/snippets/dataloader/src/n-plus-1-problem.ts{ts twoslash}

When we execute the following query:

<<< @/snippets/dataloader/src/users-with-posts.graphql{graphql}

The backend execution flow will be:
1.  Execute one query to fetch all user lists (`SELECT * FROM users`).
2.  **For each** returned user, execute another query to fetch that user's posts (`SELECT * FROM posts WHERE authorId = ?`).

If the first query returns N users, then to fetch their posts, we would collectively execute 1 (fetch users) + N (fetch posts for each user) queries. This is known as the "N+1 Query Problem". When N is large, this puts immense pressure on the database, leading to performance bottlenecks.

GQLoom provides powerful tools to elegantly solve this problem.

## `field().load()` Method

 The simplest way is to use the `field().load()` method. It transforms the resolver function from handling a single parent object to handling a batch of parent objects, allowing for bulk data fetching.

The `load` method accepts an asynchronous function as a parameter. The first parameter of this function is an array of parent objects, `parents`, and subsequent parameters are the input arguments `args` for that field.
This asynchronous function needs to return an array of the same length as the `parents` array, where each element corresponds to the result for a parent object.

::: info
It is crucial that the returned array strictly matches the order and length of the `parents` array. `DataLoader` relies on this order to correctly map results back to each parent object.
:::

Let's look at an example. To solve the N+1 problem mentioned above, we can modify the resolver like this:

<<< @/snippets/dataloader/src/load-method.ts{ts twoslash}

In the code above, the `load` function receives a `userList` array. We extract the `id` of all users and use the `inArray` operation to fetch all related posts from the database in a single query. Then, we group the posts by `authorId` and finally map them back to an array whose order matches `userList`.

Thus, regardless of how many users we request, the query to the `posts` table will only be executed once.

## LoomDataLoader

`field().load()` is a convenient API provided by GQLoom, which internally creates and manages `DataLoader` instances for us.
However, in some scenarios, we might need finer control, or want to share the same data loader instance across different resolvers.
In such cases, we can use `LoomDataLoader`.

`GQLoom` provides the `LoomDataLoader` abstract class and the `EasyDataLoader` convenience class for creating custom data loaders.

### Custom Data Loaders (LoomDataLoader)

We can create a custom data loader by extending `LoomDataLoader` and implementing the `batchLoad` method.

<<< @/snippets/dataloader/src/loom-dataloader.ts{ts twoslash}

To ensure that each request has an independent data loader instance and to prevent data cache pollution between different requests, we typically combine it with the `createMemoization` function from [Context](./context). This will create a singleton loader within the lifecycle of each request.

<<< @/snippets/dataloader/src/loom-dataloader.ts{ts twoslash}

In this example, when `useUserLoader()` is called multiple times within the same GraphQL request, it will return the same `UserLoader` instance. Therefore, multiple calls to `loader.load(id)` will be automatically batched, and the `batchLoad` function will only be executed once.

### Convenient Data Loaders (EasyDataLoader)

If you are not a fan of object-oriented programming, you can use `EasyDataLoader`. It accepts a `batchLoad` function as a constructor parameter.

The `useUserLoader` above can be simplified with `EasyDataLoader`:

<<< @/snippets/dataloader/src/easy-dataloader.ts{ts twoslash}