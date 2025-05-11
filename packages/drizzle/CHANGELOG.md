# Changelog

All notable changes to this project will be documented in this file.

## next (YYYY-MM-DD)

- Refactor: Migrating to Relational Queries version 2
- Feat: add `DrizzleResolverFactory.queriesResolver` to create a read-only resolver
- Feat: add `getSelectedColumns` to get the selected columns from the resolver payload

## 0.8.6 (2025-04-28)

- Fix: update input types for onConflictDoUpdate operations

## 0.8.5 (2025-04-28)

- Feat: Enhanced the drizzleSilk function to accept configuration options, improving flexibility in schema generation.
- Feat: add `onConflictDoUpdate` and `onConflictDoNothing` to insert mutation for Postgres and SQLite

## 0.8.4 (2025-04-21)

- Fix: update resolver factory options type

## 0.8.3 (2025-04-16)

- Feat: add count query functionality to resolver factory
- Feat: Add column visibility configuration for input and filter generation

## 0.8.2 (2025-04-08)

- Feat: support drizzle text enum

## 0.8.1 (2025-03-23)

- Feat: export all types

## 0.8.0 (2025-03-11)

- Feat: Use the chain method to add custom inputs and middleware to `drizzleResolverFactory`:
  ```ts
  // before 
  export const usersResolver = resolver.of(users, {
    user: usersResolverFactory.selectSingleQuery({
      input: v.pipe( 
        v.object({ id: v.number() }), 
        v.transform(({ id }) => ({ where: eq(users.id, id) })) 
      ), 
    }), 
   
    users: usersResolverFactory.selectArrayQuery(),
   
    posts: usersResolverFactory.relationField("posts"),
  })
  
  // now
  export const usersResolver = resolver.of(users, {
    user: usersResolverFactory.selectSingleQuery().input(
      v.pipe(
        v.object({ id: v.number() }),
        v.transform(({ id }) => ({ where: eq(users.id, id) }))
      )
    ),

    users: usersResolverFactory.selectArrayQuery(),

    posts: usersResolverFactory.relationField("posts"),
  })
  ```
- Refactor: remove `DrizzleResolverFactory.create`, use `drizzleResolverFactory` instead

## 0.7.2 (2025-02-16)

- Fix: update document link in README

## 0.7.1 (2025-02-12)

- Fix: `package.json` remove `postinstall` 