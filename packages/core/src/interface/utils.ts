export type MayPromise<T> = T | Promise<T>;

export type IsUndefined<T> = T extends undefined ? true : false;
