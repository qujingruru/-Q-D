/**
 * Dev calibration harness — runs persona grids and prints outcome stats.
 * Usage: npx tsx scripts/calibrate.ts
 * Targets (entertainment calibration, directions from literature):
 *   secure×secure   P(50y) ∈ [0.35, 0.70], median high
 *   anxious×avoid   P(50y) < 0.10, median 2–8y
 *   repair monotone, endReason mix present
 */
import { constructsToParams, PERSONAS } from '../src/model/params'
import { simulateRun } from '../src/model/engine'
import { runSeed } from '../src/sim/rng'
import type { CoupleInit, PersonParams } from '../src/types'
import { HORIZON_WEEKS } from '../src/model/constants'

const INIT: CoupleInit = { togetherMonths: 12, stage: 'steady', satisfaction: 1.0 }

function stats(persons: [PersonParams, PersonParams], n: number, base: number) {
  const durs: number[] = []
  const reasons = new Map<string, number>()
  let survived = 0
  for (let r = 0; r < n; r++) {
    const s = simulateRun({ seed: runSeed(base, r), runIndex: r, persons, init: INIT }).summary
    if (s.survived) survived++
    durs.push(s.durationWeeks)
    reasons.set(s.endReason, (reasons.get(s.endReason) ?? 0) + 1)
  }
  durs.sort((a, b) => a - b)
  const med = durs[n >> 1]
  const p50 = ((survived / n) * 100).toFixed(1)
  const rs = [...reasons.entries()].map(([k, v]) => `${k}:${((v / n) * 100).toFixed(0)}%`).join(' ')
  return { p50, medYears: (med / 52).toFixed(1), rs }
}

const N = Number(process.argv[2] ?? 600)
const t0 = Date.now()
const pairsToTest: Array<[string, string]> = [
  ['secure', 'secure'],
  ['gentle', 'secure'],
  ['anxious', 'avoidant'],
  ['volatile', 'volatile'],
  ['anxious', 'anxious'],
  ['avoidant', 'avoidant'],
]
for (let i = 0; i < pairsToTest.length; i++) {
  const [a, b] = pairsToTest[i]
  const persons: [PersonParams, PersonParams] = [constructsToParams(PERSONAS[a].constructs), constructsToParams(PERSONAS[b].constructs)]
  const s = stats(persons, N, 10000 * (i + 1))
  console.log(`${a}×${b}`.padEnd(18), `P(50y)=${s.p50}%`.padEnd(13), `median=${s.medYears}y`.padEnd(14), s.rs)
}
console.log(`\n${(N * pairsToTest.length)} runs in ${Date.now() - t0}ms → ${((Date.now() - t0) / (N * pairsToTest.length)).toFixed(2)}ms/run (horizon ${HORIZON_WEEKS}w)`)
