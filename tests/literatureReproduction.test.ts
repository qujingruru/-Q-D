/**
 * Literature reproduction suite — the model must reproduce the *directional*
 * findings of the anchored literature (plan/model-spec.md §9). This is what
 * makes "literature-backed" a testable property instead of a decoration.
 *
 * Method note: all A/B comparisons use common random numbers (the same seed
 * set for both arms), so per-world luck cancels and the paired difference has
 * far lower variance than independent samples.
 */
import { describe, expect, it } from 'vitest'
import { constructsToParams, PERSONAS } from '../src/model/params'
import { simulateRun } from '../src/model/engine'
import { runSeed } from '../src/sim/rng'
import { buildScenarios } from '../src/model/scenarios'
import type { CoupleInit, PersonParams, RunSummary, ScenarioModule } from '../src/types'

const INIT: CoupleInit = { togetherMonths: 12, stage: 'steady', satisfaction: 1.0 }
const N = 600

/** Run arms over the SAME seeds (paired / common random numbers). */
function runPaired(
  persons: [PersonParams, PersonParams],
  arms: Array<{ scenarios?: ScenarioModule[] }>,
  seedBase: number,
): RunSummary[][] {
  return arms.map((arm) => {
    const out: RunSummary[] = []
    for (let r = 0; r < N; r++) {
      out.push(simulateRun({ seed: runSeed(seedBase, r), runIndex: r, persons, init: INIT, scenarios: arm.scenarios ?? [] }).summary)
    }
    return out
  })
}

const p50 = (xs: RunSummary[]): number => xs.filter((s) => s.survived).length / xs.length
const couple = (a: string, b: string): [PersonParams, PersonParams] => [
  constructsToParams(PERSONAS[a].constructs),
  constructsToParams(PERSONAS[b].constructs),
]

describe('T3 · parental opposition (Sinclair, Hood & Wright 2014)', () => {
  it('boosts early commitment, then net-erodes survival', () => {
    const persons = couple('gentle', 'secure')
    const [base, opposed] = runPaired(persons, [{}, { scenarios: buildScenarios({ parental: { intensity: 0.7 } }) }], 3300)

    // short-run unity boost: mean commitment over first 26 weeks is higher
    let earlyBase = 0
    let earlyOpp = 0
    for (let r = 0; r < 80; r++) {
      const seed = runSeed(3900, r)
      const a = simulateRun({ seed, persons, init: INIT, record: true })
      const b = simulateRun({ seed, persons, init: INIT, record: true, scenarios: buildScenarios({ parental: { intensity: 0.7 } }) })
      const slice = (tr: typeof a.trajectory) => {
        const pts = tr.filter((p) => p.week <= 26)
        return pts.reduce((s, p) => s + 0.5 * (p.comQ + p.comD), 0) / Math.max(1, pts.length)
      }
      earlyBase += slice(a.trajectory)
      earlyOpp += slice(b.trajectory)
    }
    expect(earlyOpp / 80).toBeGreaterThan(earlyBase / 80)
    // long-run net negative
    expect(p50(base) - p50(opposed)).toBeGreaterThan(0.05)
  })
})

describe('T4 · long distance + reunion (Stafford & Merolla 2007)', () => {
  it('is no riskier than baseline while apart, then spikes after reunion', () => {
    const persons = couple('gentle', 'secure')
    const APART = 104
    const [base, ldr] = runPaired(persons, [{}, { scenarios: buildScenarios({ ldr: { durationWeeks: APART } }) }], 4400)

    const endBefore = (xs: RunSummary[], hi: number) => xs.filter((s) => s.durationWeeks < hi).length / xs.length
    expect(endBefore(ldr, APART)).toBeLessThanOrEqual(endBefore(base, APART) * 1.1 + 0.02)

    const windowRate = (xs: RunSummary[]) => {
      const atRisk = xs.filter((s) => s.durationWeeks >= APART).length
      const died = xs.filter((s) => s.durationWeeks >= APART && s.durationWeeks < APART + 12).length
      return died / Math.max(1, atRisk)
    }
    expect(windowRate(ldr)).toBeGreaterThanOrEqual(windowRate(base) * 2)
  })
})

describe('T5 · financial stress severity (Conger et al.)', () => {
  it('P(50y) strictly decreases with severity', () => {
    const persons = couple('gentle', 'secure')
    const [p0, p1, p2] = runPaired(persons, [
      {},
      { scenarios: buildScenarios({ financial: { severity: 0.5 } }) },
      { scenarios: buildScenarios({ financial: { severity: 1.0 } }) },
    ], 5500).map(p50)
    expect(p0 - p1).toBeGreaterThan(0.03)
    expect(p1 - p2).toBeGreaterThan(0.03)
  })
})

describe('T6 · capitalization (Gable et al. 2004)', () => {
  it('passive-responding couples survive less often', () => {
    const mk = (cap: number): [PersonParams, PersonParams] => {
      const c = { ...PERSONAS.gentle.constructs, cap }
      return [constructsToParams(c), constructsToParams(c)]
    }
    // CRN across different couples: same seeds, different parameters
    const seeds = Array.from({ length: N }, (_, r) => runSeed(6600, r))
    const run = (persons: [PersonParams, PersonParams]) =>
      seeds.map((seed, r) => simulateRun({ seed, runIndex: r, persons, init: INIT }).summary)
    expect(p50(run(mk(0.8))) - p50(run(mk(0.2)))).toBeGreaterThan(0.03)
  })
})

describe('T9 · sliding vs deciding cohabitation (Stanley et al. 2006)', () => {
  it('decided movers survive more often than sliders', () => {
    // volatile couple sits on the steep part of the dose-response curve where
    // commitment shifts are measurable; gentle×secure saturates near the top
    const persons = couple('volatile', 'volatile')
    const [sliding, deciding] = runPaired(persons, [
      { scenarios: buildScenarios({ cohabitation: { decided: false } }) },
      { scenarios: buildScenarios({ cohabitation: { decided: true } }) },
    ], 7700)
    expect(p50(deciding) - p50(sliding)).toBeGreaterThan(0.05)
  })
})

describe('T10 · VSA vulnerability × support (Karney & Bradbury 1995)', () => {
  it('high-neuroticism + low-support suffers far more from adversity', () => {
    const mk = (neu: number, partnerCap: number, partnerAgr: number): [PersonParams, PersonParams] => {
      const victim = constructsToParams({ ...PERSONAS.gentle.constructs, neu })
      const partner = constructsToParams({ ...PERSONAS.secure.constructs, cap: partnerCap, agr: partnerAgr })
      return [victim, partner]
    }
    const seeds = Array.from({ length: N }, (_, r) => runSeed(8800, r))
    const scenarios = buildScenarios({ majorEvent: { count: 2, kind: 'illness' } })
    const run = (persons: [PersonParams, PersonParams]) =>
      seeds.map((seed, r) => simulateRun({ seed, runIndex: r, persons, init: INIT, scenarios }).summary)
    expect(p50(run(mk(0.2, 0.8, 0.8))) - p50(run(mk(0.85, 0.2, 0.3)))).toBeGreaterThan(0.1)
  })
})
