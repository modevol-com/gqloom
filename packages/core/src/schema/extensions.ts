export interface GQLoomExtensions {
  defaultValue?: any
  gqloom?: GQLoomExtensionAttribute
  directives?: DirectiveItem[] | DirectiveRecord
}

export interface DirectiveItem {
  name: string
  args?: Record<string, any>
}

export type DirectiveRecord = Record<string, Record<string, any>>

export interface GQLoomExtensionAttribute {
  directives?: string[]
}
