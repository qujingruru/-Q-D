import type { EventRecord, PersonParams, ScenarioModule } from '../../types'

export interface BabyConfig {
  atWeek?: number
}

/**
 * ⑥ Baby transition (Cowan & Cowan 1995; Doss et al. 2009): a 104-week
 * high-demand regime — lowered set points (buffered by agreeableness), more
 * conflicts, less intimacy growth — but a large investment jump, and couples
 * with high capitalization can come out closer (bimodal outcomes).
 */
export function makeBaby(cfg: BabyConfig = {}): ScenarioModule {
  const atWeek = cfg.atWeek ?? 104
  const regime = 104
  let persons: [PersonParams, PersonParams] | null = null
  let baseB: [number, number] = [0, 0]
  let drag = 1.0
  let capAvg = 0.5
  return {
    id: 'baby',
    events: [] as EventRecord[],
    setup(ctx) {
      persons = ctx.persons
      baseB = [persons[0].b, persons[1].b]
      const agrAvg = 0.5 * (persons[0].constructs.agr + persons[1].constructs.agr)
      capAvg = 0.5 * (persons[0].constructs.cap + persons[1].constructs.cap)
      drag = 1.0 * (1 - 0.5 * agrAvg)
    },
    weekly(t, state, _rng, mods) {
      if (t === atWeek) {
        state.investments = Math.min(2.5, state.investments + 1.0)
        this.events!.push({ week: t, type: 'milestone', who: 0, magnitude: 0.9, label: 'baby' })
      }
      if (!persons) return
      if (t >= atWeek && t < atWeek + regime) {
        persons[0].b = baseB[0] - drag
        persons[1].b = baseB[1] - drag
        mods.conflictRateMul *= 1.4
        mods.intimacyGrowthMul *= 0.3
        mods.externalStress = Math.max(mods.externalStress, 0.3)
      } else if (t === atWeek + regime) {
        persons[0].b = baseB[0]
        persons[1].b = baseB[1]
        if (capAvg > 0.65) {
          state.intimacy = Math.min(1, state.intimacy + 0.12)
          this.events!.push({ week: t, type: 'milestone', who: 0, magnitude: 0.9, label: 'baby-growth' })
        } else {
          state.trust[0] = Math.max(0, state.trust[0] - 0.04)
          state.trust[1] = Math.max(0, state.trust[1] - 0.04)
        }
      }
    },
  }
}
