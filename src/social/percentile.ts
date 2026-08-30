/**
 * Percentile against the static reference pool (v1.0, zero backend).
 * The pool is generated offline by `npm run reference` — a grid of simulated
 * couples, so the honest wording is "模拟情侣". A Remote implementation can
 * replace this behind the same interface later (plan §四).
 */
import type { McResult } from '../report/stats'
import { outcomeScore } from '../report/stats'

export interface ReferencePool {
  version: number
  couples: number
  runsPerCouple: number
  score: string
  buckets: number[]
}

let cache: ReferencePool | null | undefined

export async function loadPool(): Promise<ReferencePool | null> {
  if (cache !== undefined) return cache
  try {
    const res = await fetch('./reference-pool.json')
    if (!res.ok) throw new Error(String(res.status))
    cache = (await res.json()) as ReferencePool
  } catch {
    cache = null
  }
  return cache
}

/** percentile: share of reference couples strictly below this score (0..1) */
export function percentile(pool: ReferencePool, result: McResult): number {
  const score = outcomeScore(result)
  const total = pool.buckets.reduce((a, b) => a + b, 0)
  if (total === 0) return 0
  const bucket = Math.max(0, Math.min(100, Math.round(score * 100)))
  let below = 0
  for (let i = 0; i < bucket; i++) below += pool.buckets[i]
  // within-bucket linear interpolation
  const inBucket = pool.buckets[bucket]
  const frac = inBucket > 0 ? Math.min(1, (score * 100 - bucket + 0.5)) : 0
  return Math.max(0, Math.min(1, (below + frac * inBucket) / total))
}
