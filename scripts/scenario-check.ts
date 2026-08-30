/** Dev diagnostic: scenario effect sizes on a gentle×secure couple. */
import { constructsToParams, PERSONAS } from '../src/model/params'
import { simulateRun } from '../src/model/engine'
import { runSeed } from '../src/sim/rng'
import { buildScenarios } from '../src/model/scenarios'
import type { CoupleInit, PersonParams, RunSummary, ScenarioModule } from '../src/types'

const INIT: CoupleInit = { togetherMonths: 12, stage: 'steady', satisfaction: 1.0 }
const couple = (a: string, b: string): [PersonParams, PersonParams] => [
  constructsToParams(PERSONAS[a].constructs), constructsToParams(PERSONAS[b].constructs),
]
const N = 500
function go(label: string, persons: [PersonParams, PersonParams], base: number, scenarios: ScenarioModule[] = []) {
  let survived = 0
  const durs: number[] = []
  let earlyCom = 0
  for (let r = 0; r < N; r++) {
    const d = simulateRun({ seed: runSeed(base, r), persons, init: INIT, scenarios, record: r < 60 })
    const s: RunSummary = d.summary
    if (s.survived) survived++
    durs.push(s.durationWeeks)
    if (r < 60) {
      const pts = d.trajectory.filter((p) => p.week <= 26)
      earlyCom += pts.reduce((acc, p) => acc + 0.5 * (p.comQ + p.comD), 0) / Math.max(1, pts.length)
    }
  }
  durs.sort((a, b) => a - b)
  console.log(
    label.padEnd(34),
    `P50y=${((survived / N) * 100).toFixed(1)}%`.padEnd(11),
    `med=${(durs[N >> 1] / 52).toFixed(1)}y`.padEnd(10),
    `earlyCom=${(earlyCom / 60).toFixed(3)}`,
  )
}

const gs = couple('gentle', 'secure')
go('baseline', gs, 100)
go('financial f=0.5', gs, 200, buildScenarios({ financial: { severity: 0.5 } }))
go('financial f=1.0', gs, 300, buildScenarios({ financial: { severity: 1.0 } }))
go('parental k=0.7', gs, 400, buildScenarios({ parental: { intensity: 0.7 } }))
go('cohabit sliding', gs, 500, buildScenarios({ cohabitation: { decided: false } }))
go('cohabit decided', gs, 600, buildScenarios({ cohabitation: { decided: true } }))

const cap = (v: number) => constructsToParams({ ...PERSONAS.gentle.constructs, cap: v })
const capPair = (v: number): [PersonParams, PersonParams] => [cap(v), cap(v)]
go('cap=0.8 pair', capPair(0.8), 700)
go('cap=0.2 pair', capPair(0.2), 800)

const vsa = (neu: number, pc: number, pa: number): [PersonParams, PersonParams] => [
  constructsToParams({ ...PERSONAS.gentle.constructs, neu }),
  constructsToParams({ ...PERSONAS.secure.constructs, cap: pc, agr: pa }),
]
const events2 = buildScenarios({ majorEvent: { count: 2, kind: 'illness' } })
go('vsa fragile ×2 illness', vsa(0.85, 0.2, 0.3), 900, events2)
go('vsa resilient ×2 illness', vsa(0.2, 0.8, 0.8), 950, events2)
