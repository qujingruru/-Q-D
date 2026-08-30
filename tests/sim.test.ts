import { describe, expect, it } from 'vitest'
import { monteCarlo } from '../src/sim/monteCarlo'
import { aggregate, outcomeScore } from '../src/report/stats'
import { replayWorld, downsample, topEvents } from '../src/sim/replay'
import { constructsToParams, PERSONAS } from '../src/model/params'
import type { CoupleInit, PersonParams } from '../src/types'

const INIT: CoupleInit = { togetherMonths: 12, stage: 'steady', satisfaction: 1.0 }
const persons: [PersonParams, PersonParams] = [
  constructsToParams(PERSONAS.gentle.constructs),
  constructsToParams(PERSONAS.secure.constructs),
]

describe('monteCarlo + aggregate', () => {
  it('matches single-run engine results exactly (MC/replay consistency)', () => {
    const summaries = monteCarlo({ masterSeed: 999, runs: 300, persons, init: INIT })
    expect(summaries.length).toBe(300)
    // every summary must equal a direct engine replay of the same seed
    for (const s of summaries.slice(0, 20)) {
      const detail = replayWorld({ summary: s, persons, init: INIT })
      expect(detail.summary.durationWeeks).toBe(s.durationWeeks)
      expect(detail.summary.endReason).toBe(s.endReason)
      expect(detail.summary.dramaScore).toBe(s.dramaScore)
    }
  })

  it('reports progress batches in order', () => {
    const seen: number[] = []
    monteCarlo({
      masterSeed: 5, runs: 100, persons, init: INIT, batchSize: 30,
      onProgress: (done) => seen.push(done),
    })
    expect(seen).toEqual([30, 60, 90, 100])
  })

  it('aggregates headline stats coherently', () => {
    const res = aggregate(monteCarlo({ masterSeed: 77, runs: 400, persons, init: INIT }))
    expect(res.n).toBe(400)
    expect(res.p50y).toBeGreaterThanOrEqual(0)
    expect(res.p50y).toBeLessThanOrEqual(1)
    expect(res.histogram.reduce((s, b) => s + b.count, 0)).toBe(400)
    expect(res.endReasons.reduce((s, r) => s + r.share, 0)).toBeCloseTo(1, 5)
    expect(res.survival[0].s).toBe(1)
    expect(res.survival[res.survival.length - 1].s).toBeCloseTo(res.p50y, 5)
    // survival is non-increasing
    for (let i = 1; i < res.survival.length; i++) {
      expect(res.survival[i].s).toBeLessThanOrEqual(res.survival[i - 1].s + 1e-9)
    }
    expect(res.curated.longest.durationWeeks).toBeGreaterThanOrEqual(res.curated.shortest.durationWeeks)
    expect(outcomeScore(res)).toBeGreaterThan(0)
  })

  it('curates a miracle world with top drama among survivors', () => {
    const summaries = monteCarlo({ masterSeed: 321, runs: 400, persons, init: INIT })
    const res = aggregate(summaries)
    if (res.curated.miracle) {
      const survivors = summaries.filter((s) => s.survived)
      const maxDrama = Math.max(...survivors.map((s) => s.dramaScore))
      expect(res.curated.miracle.dramaScore).toBe(maxDrama)
    }
  })
})

describe('replay helpers', () => {
  it('replays deterministically and records rich detail', () => {
    const summaries = monteCarlo({ masterSeed: 11, runs: 50, persons, init: INIT })
    const pick = summaries[7]
    const a = replayWorld({ summary: pick, persons, init: INIT })
    const b = replayWorld({ summary: pick, persons, init: INIT })
    expect(a.trajectory).toEqual(b.trajectory)
    expect(a.events).toEqual(b.events)
    expect(a.trajectory.length).toBeGreaterThan(100)
  })

  it('reproduces scenario worlds identically (LDR reunion event present)', () => {
    const sel = { ldr: { durationWeeks: 104 } }
    const summaries = monteCarlo({ masterSeed: 42, runs: 60, persons, init: INIT, scenarioSelection: sel })
    const pick = summaries[3]
    const detail = replayWorld({ summary: pick, persons, init: INIT, scenarioSelection: sel })
    expect(detail.summary.durationWeeks).toBe(pick.durationWeeks)
    const labels = detail.events.map((e) => e.label)
    expect(labels).toContain('ldr-start')
  })

  it('downsamples and ranks story events', () => {
    const summaries = monteCarlo({ masterSeed: 13, runs: 30, persons, init: INIT })
    const detail = replayWorld({ summary: summaries[0], persons, init: INIT })
    const ds = downsample(detail.trajectory, 50)
    expect(ds.length).toBeLessThanOrEqual(51)
    expect(ds[0].week).toBe(0)
    const top = topEvents(detail.events, 5)
    expect(top.length).toBeLessThanOrEqual(5)
    const mags = top.map((e) => Math.abs(e.magnitude))
    const sorted = [...mags].sort((a, b) => b - a)
    expect(mags).toEqual(sorted) // impact-ranked
    const weeks = top.map((e) => e.week)
    expect(weeks).toEqual([...weeks].sort((a, b) => a - b)) // time-ordered output
  })
})
