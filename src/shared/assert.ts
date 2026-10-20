/** Makes a `switch` over a discriminated union exhaustive: a missing case fails to compile. */
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`)
}
