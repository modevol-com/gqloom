# 数据加载器（Dataloader）

由于 GraphQL 的灵活性，当我们加载某个对象的关联对象时，我们通常需要执行多个查询。
这就造成了著名的 N+1 查询问题。为了解决这个问题，我们可以使用 [DataLoader](https://github.com/graphql/dataloader)。

`DataLoader` 能够将多个请求合并为一个请求，从而减少数据库的查询次数，同时还能缓存查询结果，避免重复查询。

## N+1 查询问题

考虑一个场景，我们需要查询所有用户以及他们各自发表的帖子。我们的数据表结构如下：

<<< @/snippets/dataloader/src/schema.ts{ts twoslash}

一个直观的解析器实现可能是这样的：

<<< @/snippets/dataloader/src/n-plus-1-problem.ts{ts twoslash}

当我们执行以下查询时：

<<< @/snippets/dataloader/src/users-with-posts.graphql{graphql}

后台的执行流程会是：
1.  执行一次查询获取所有用户列表（`SELECT * FROM users`）。
2.  **对于每一个** 返回的用户，再去执行一次查询来获取该用户的帖子（`SELECT * FROM posts WHERE authorId = ?`）。

如果第一个查询返回了 N 个用户，那么为了获取他们的帖子，我们总共需要执行 1 (获取用户) + N (获取每个用户的帖子) 次查询。这就是所谓的 “N+1 查询问题”。当 N 很大时，这会对数据库造成巨大的压力，导致性能瓶颈。

GQLoom 提供了强大的工具来优雅地解决这个问题。

## `field().load()` 方法

最简单的用法是使用 `field().load()` 方法。它将解析函数从处理单个父对象转变为处理一批父对象，从而允许我们进行批量数据获取。

`load` 方法接受一个异步函数作为参数，该函数的第一个参数是父对象的数组 `parents`，后续参数则是该字段的输入参数 `args`。
这个异步函数需要返回一个与 `parents` 数组等长的数组，其中每个元素对应一个父对象的结果。

::: info
必须保证返回的数组与 `parents` 数组的顺序和长度完全一致。`DataLoader` 依赖此来正确地将结果映射回每个父对象。
:::

让我们来看一个例子。要解决上面提到的 N+1 问题，我们可以这样修改解析器：

<<< @/snippets/dataloader/src/load-method.ts{ts twoslash}

在上面的代码中，`load` 函数接收一个 `userList` 数组。我们提取所有用户的 `id`，并使用 `inArray` 操作一次性从数据库中查询出所有相关的帖子。然后，我们将帖子按 `authorId` 分组，并最终映射回与 `userList` 顺序一致的结果数组。

这样，无论我们请求多少个用户，对 `posts` 表的查询都只会执行一次。

## LoomDataLoader

`field().load()` 是 GQLoom 提供的便捷 API，它在内部为我们创建和管理 `DataLoader` 实例。
然而，在某些场景下，我们可能需要更精细的控制，或者在不同的解析器之间共享同一个数据加载器实例。
这时，我们可以使用 `LoomDataLoader`。

`GQLoom` 提供了 `LoomDataLoader` 抽象类和 `EasyDataLoader` 便捷类，用于创建自定义的数据加载器。

### 数据加载器子类 (LoomDataLoader)

我们可以通过继承 `LoomDataLoader` 并实现 `batchLoad` 方法来创建自定义的数据加载器。

<<< @/snippets/dataloader/src/loom-dataloader.ts{ts twoslash}

为了确保每个请求都有一个独立的数据加载器实例，避免不同请求之间的数据缓存污染，我们通常会结合[上下文](./context)中的 `createMemoization` 函数来使用。这将在每个请求的生命周期内创建一个单例的加载器。

<<< @/snippets/dataloader/src/loom-dataloader.ts{ts twoslash}

在这个例子中，`useUserLoader()` 在同一个 GraphQL 请求中多次被调用时，会返回同一个 `UserLoader` 实例。因此，对 `loader.load(id)` 的多次调用将被自动批量处理，并且 `batchLoad` 函数只会被执行一次。

### 便捷数据加载器 (EasyDataLoader)

如果你不是一个面向对象编程的爱好者，可以使用 `EasyDataLoader`。它接受一个 `batchLoad` 函数作为构造函数参数。

上面的 `useUserLoader` 可以用 `EasyDataLoader` 简化为：

<<< @/snippets/dataloader/src/easy-dataloader.ts{ts twoslash}