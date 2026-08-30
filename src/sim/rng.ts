/**
 * Seeded deterministic PRNG: xoshiro128** with splitmix32 seeding.
 * Zero dependencies, cross-realm safe (same numbers in worker/main/node),
 * fast enough for 10k runs x 2600 weeks of draws.
 */

export type Rng = () => number // uniform [0,1)

/** splitmix32 — used for seeding the four state words. */
export function splitmix32(a: number): number {
  a |= 0
  a = (a + 0x9e3779b9) | 0
  let t = Math.imul(a ^ (a >>> 16), 0x21f0aaad)
  t = Math.imul(t ^ (t >>> 15), 0x735a2d97)
  return (t ^ (t >>> 15)) >>> 0
}

function rotl(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0
}

/** Build a deterministic uniform generator from a 32-bit seed. */
export function makeRng(seed: number): Rng {
  let s0 = splitmix32(seed)
  let s1 = splitmix32(s0)
  let s2 = splitmix32(s1)
  let s3 = splitmix32(s2)
  if ((s0 | s1 | s2 | s3) === 0) s0 = 1 // never all-zero
  return () => {
    const result = Math.imul(rotl(Math.imul(s1, 5), 7), 9)
    const t = (s1 << 9) >>> 0
    s2 ^= s0
    s3 ^= s1
    s1 ^= s2
    s0 ^= s3
    s2 ^= t
    s3 = rotl(s3, 11)
    return (result >>> 0) / 4294967296
  }
}

/** Deterministic per-run seed from (masterSeed, runIndex). */
export function runSeed(masterSeed: number, runIndex: number): number {
  return splitmix32((masterSeed ^ Math.imul(runIndex + 1, 0x9e3779b9)) >>> 0)
}

/**
 * Box–Muller normal sampler bound to a uniform rng (deterministic draw order).
 */
export function makeNormal(rng: Rng): (sd: number) => number {
  let cache: number | null = null
  return (sd: number) => {
    if (cache !== null) {
      const v = cache
      cache = null
      return v * sd
    }
    let u = 0
    let v = 0
    while (u === 0) u = rng()
    v = rng()
    const r = Math.sqrt(-2 * Math.log(u))
    cache = r * Math.sin(2 * Math.PI * v)
    return r * Math.cos(2 * Math.PI * v) * sd
  }
}
