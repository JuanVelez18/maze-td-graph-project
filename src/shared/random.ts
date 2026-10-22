/** A seeded source of numbers in [0, 1). Each call advances its own hidden state. */
export type Rng = () => number

/**
 * Mulberry32: a tiny 32-bit PRNG, good enough for games. The same seed always gives the same
 * sequence, which keeps randomness a piece of data instead of a side effect.
 */
export function createRng(seed: number): Rng {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32
  }
}

/** An integer in [min, max], both included. */
export function randomInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}
