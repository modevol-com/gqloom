# Changelog

All notable changes to this project will be documented in this file.

## next (YYYY-MM-DD)

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