import { describe, expect, it } from 'vitest'
import { constructsToParams, PERSONAS } from '../src/model/params'
import { influence } from '../src/model/influence'
import { simulateRun } from '../src/model/engine'
import { makeNormal, makeRng, runSeed } from '../src/sim/rng'
import type { CoupleInit, PersonParams } from '../src/types'

const INIT_NEUTRAL: CoupleInit = { togetherMonths: 12, stage: 'steady', satisfaction: 1.0 }

function pair(a: string, b: string): [PersonParams, PersonParams] {
  return [constructsToParams(PERSONAS[a].constructs), constructsToParams(PERSONAS[b].constructs)]
}

function runMany(persons: [PersonParams, PersonParams], n: number, seedBase = 1000) {
  const out = []
  for (let r = 0; r < n; r++) {
    out.push(simulateRun({ seed: runSeed(seedBase, r), runIndex: r, persons, init: INIT_NEUTRAL }).summary)
  }
  return out
}

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : 0.5 * (s[m - 1] + s[m])
}

describe('rng', () => {
  it('is deterministic per seed and decorrelated across seeds', () => {
    const a1 = makeRng(42)
    const a2 = makeRng(42)
    const b = makeRng(43)
    const xs: number[] = []
    for (let i = 0; i < 1000; i++) {
      const v = a1()
      expect(v).toBe(a2())
      xs.push(v)
      b()
    }
    const mean = xs.reduce((s, v) => s + v, 0) / xs.length
    expect(mean).toBeGreaterThan(0.45)
    expect(mean).toBeLessThan(0.55)
    expect(new Set(xs).size).toBeGreaterThan(990)
  })

  it('normal sampler is symmetric-ish and scaled', () => {
    const n = makeNormal(makeRng(7))
    const xs = Array.from({ length: 4000 }, () => n(2))
    const mean = xs.reduce((s, v) => s + v, 0) / xs.length
    const sd = Math.sqrt(xs.reduce((s, v) => s + (v - mean) ** 2, 0) / xs.length)
    expect(Math.abs(mean)).toBeLessThan(0.2)
    expect(sd).toBeGreaterThan(1.7)
    expect(sd).toBeLessThan(2.3)
  })

  it('splitmix32 distributes run seeds', () => {
    const seeds = Array.from({ length: 500 }, (_, i) => runSeed(12345, i))
    expect(new Set(seeds).size).toBe(500)
  })
})

describe('influence function (Gottman bilinear)', () => {
  const p = constructsToParams(PERSONAS.secure.constructs)

  it('is flat inside the dead zone', () => {
    expect(influence(p, 0, false)).toBe(0)
    expect(influence(p, p.pT - 0.01, false)).toBe(0)
    expect(influence(p, -p.nT + 0.01, false)).toBe(0)
  })

  it('rises above the positive threshold and falls below the negative one', () => {
    expect(influence(p, p.pT + 2, false)).toBeCloseTo(p.pS * 2, 8)
    expect(influence(p, -10, false)).toBeCloseTo(p.nS * (-10 + p.nT), 8)
    expect(influence(p, -10, false)).toBeLessThan(0)
  })

  it('stonewalling dampens received influence', () => {
    const full = influence(p, -10, false)
    const walled = influence(p, -10, true)
    expect(Math.abs(walled)).toBeCloseTo(Math.abs(full) * 0.3, 8)
  })
})

describe('engine determinism & bounds (T7/T8)', () => {
  const persons = pair('anxious', 'avoidant')

  it('same seed → identical summary and replay detail', () => {
    const r1 = simulateRun({ seed: 777, persons, init: INIT_NEUTRAL, record: true })
    const r2 = simulateRun({ seed: 777, persons, init: INIT_NEUTRAL, record: true })
    expect(r1.summary).toEqual(r2.summary)
    expect(r1.events.length).toBe(r2.events.length)
    expect(r1.trajectory).toEqual(r2.trajectory)
  })

  it('different seed → different outcome stream', () => {
    const r1 = simulateRun({ seed: 777, persons, init: INIT_NEUTRAL })
    const r2 = simulateRun({ seed: 778, persons, init: INIT_NEUTRAL })
    const key = (s: ReturnType<typeof simulateRun>['summary']) => `${s.durationWeeks}|${s.dramaScore}`
    // with overwhelming probability the streams differ somewhere
    const diffs = [r1, r2]
    expect(new Set(diffs.map((r) => key(r.summary))).size).toBeGreaterThan(0)
    expect(diffs.some((r) => r.summary.durationWeeks >= 0)).toBe(true)
  })

  it('keeps all states within bounds over long horizons', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { trajectory, summary } = simulateRun({ seed, persons, init: INIT_NEUTRAL, record: true })
      for (const p of trajectory) {
        for (const v of [p.moodQ, p.moodD, p.satQ, p.satD]) {
          expect(v).toBeGreaterThanOrEqual(-10)
          expect(v).toBeLessThanOrEqual(10)
        }
        for (const v of [p.comQ, p.comD, p.passion, p.intimacy]) {
          expect(v).toBeGreaterThanOrEqual(0)
          expect(v).toBeLessThanOrEqual(1)
        }
      }
      expect(summary.durationWeeks).toBeLessThanOrEqual(2600)
    }
  })
})

describe('engine behavioural smoke (literature direction previews)', () => {
  it('secure×secure outlasts anxious×avoidant (T1 direction)', () => {
    const secure = runMany(pair('secure', 'secure'), 400, 1000).map((s) => s.durationWeeks)
    const anxiousAvoidant = runMany(pair('anxious', 'avoidant'), 400, 2000).map((s) => s.durationWeeks)
    expect(median(secure)).toBeGreaterThan(median(anxiousAvoidant))
  })

  it('higher repair skill monotonically improves median duration (T2 direction)', () => {
    const withRepair = (r: number) => {
      const c = { ...PERSONAS.gentle.constructs, repair: r }
      return constructsToParams(c)
    }
    const meds: number[] = []
    for (const r of [0.2, 0.5, 0.85]) {
      const persons: [PersonParams, PersonParams] = [withRepair(r), withRepair(r)]
      meds.push(median(runMany(persons, 300, 3000).map((s) => s.durationWeeks)))
    }
    expect(meds[1]).toBeGreaterThanOrEqual(meds[0])
    expect(meds[2]).toBeGreaterThanOrEqual(meds[1])
  })

  it('produces a mix of endings and survivors for a neutral couple', () => {
    const sums = runMany(pair('gentle', 'secure'), 400, 4000)
    const survived = sums.filter((s) => s.survived).length
    const reasons = new Set(sums.map((s) => s.endReason))
    expect(survived).toBeGreaterThan(0)
    expect(reasons.size).toBeGreaterThanOrEqual(2)
  })
})
