declare const brand: unique symbol

/**
 * Nominal type on top of a structural one: `Brand<number, 'CellIndex'>` is a number
 * that can only be obtained through the constructor that validates it.
 */
export type Brand<T, B extends string> = T & { readonly [brand]: B }
