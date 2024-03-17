export type MayPromise<T> = T | Promise<T>

export type IsAny<T> = 0 extends 1 & T ? true : false
