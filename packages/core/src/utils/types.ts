export type MayPromise<T> = T | Promise<T>

export type IsAny<T> = 0 extends 1 & T ? true : false

export type ValueOf<T extends object> = T[keyof T]

export type OmitInUnion<TUnion, TOmit> = TUnion extends infer T
  ? T extends TOmit
    ? never
    : T
  : never
