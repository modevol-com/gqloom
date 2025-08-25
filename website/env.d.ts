/// <reference types="vite/client" />
/// <reference types="vitepress/theme" />
/// <reference types="vue/jsx" />

declare module "*.css" {
  const classes: { readonly [key: string]: string }
  export default classes
}
