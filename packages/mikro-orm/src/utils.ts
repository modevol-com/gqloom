export type CapitalizeFirstLetter<TString extends string> =
  TString extends `${infer TFirst}${infer TRest}`
    ? `${Uppercase<TFirst>}${TRest}`
    : TString

export type LowercaseFirstLetter<TString extends string> =
  TString extends `${infer TFirst}${infer TRest}`
    ? `${Lowercase<TFirst>}${TRest}`
    : TString
