/**
 * Build the static reference pool: run the engine offline over a persona grid
 * × N seeds, score each virtual couple, and emit a 101-bucket histogram to
 * public/reference-pool.json. Zero backend percentile lookups at runtime.
 * Usage: npm run reference
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { monteCarlo } from '../src/sim/monteCarlo'
import { aggregate, outcomeScore } from '../src/report/stats'
import { constructsToParams, PERSONAS, randomConstructs } from '../src/model/params'
import { makeRng } from '../src/sim/rng'
import type { CoupleInit, PersonParams } from '../src/types'

const INIT: CoupleInit = { togetherMonths: 12, stage: 'steady', satisfaction: 1.0 }
const RUNS_PER_PAIR = 400
const RANDOM_PAIRS = 40

const names = Object.keys(PERSONAS) as Array<keyof typeof PERSONAS>
const pairs: Array<[PersonParams, PersonParams]> = []

// full persona grid
for (const a of names) {
  for (const b of names) {
    pairs.push([constructsToParams(PERSONAS[a].constructs), constructsToParams(PERSONAS[b].constructs)])
  }
}
// plus random couples so the pool isn't only archetypes
for (let i = 0; i < RANDOM_PAIRS; i++) {
  const rng = makeRng(777000 + i)
  pairs.push([constructsToParams(randomConstructs(rng)), constructsToParams(randomConstructs(rng))]
  )
}

console.log(`building reference pool: ${pairs.length} couples × ${RUNS_PER_PAIR} worlds each…`)
const scores: number[] = []
let seedBase = 20240000
for (const persons of pairs) {
  const res = aggregate(monteCarlo({ masterSeed: seedBase++, runs: RUNS_PER_PAIR, persons, init: INIT }))
  scores.push(outcomeScore(res))
}

// histogram: score in [0,1] → 101 buckets
const buckets = new Array<number>(101).fill(0)
for (const s of scores) {
  const b = Math.max(0, Math.min(100, Math.round(s * 100)))
  buckets[b]++
}

const out = {
  version: 1,
  couples: scores.length,
  runsPerCouple: RUNS_PER_PAIR,
  score: '0.6*P(>50y) + 0.4*min(medianYears,50)/50',
  buckets,
  generatedAt: new Date().toISOString(),
}
mkdirSync('public', { recursive: true })
writeFileSync('public/reference-pool.json', JSON.stringify(out))
console.log(`wrote public/reference-pool.json (${scores.length} couples, mean score ${(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(3)})`)
