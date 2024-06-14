import { type PropertyOptions } from "@mikro-orm/core"

export interface GqloomMikroFieldExtensions {
  mikroProperty?: PropertyOptions<any>
}
