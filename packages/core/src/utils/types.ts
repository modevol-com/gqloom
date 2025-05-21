export type MayPromise<T> = T | Promise<T>

export type IsAny<T> = 0 extends 1 & T ? true : false

export type ValueOf<T extends object> = T[keyof T]

export type OmitInUnion<TUnion, TOmit> = TUnion extends infer T
  ? T extends TOmit
    ? never
    : T
  : never

export type RequireKeys<T, TKey extends string | number | symbol> = {
  [P in keyof T as P extends TKey ? P : never]-?: T[P]
} & {
  [P in keyof T as P extends TKey ? never : P]: T[P]
}
