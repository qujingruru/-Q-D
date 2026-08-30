import type { CoupleState, EventRecord, PersonIndex, PersonParams, Rng, ScenarioModule, WeekMods } from '../../types'

export interface MajorEventConfig {
  count?: number
  kind?: 'jobloss' | 'illness'
}

/**
 * ④ Major adversity (Karney & Bradbury 1995 VSA — acute stress): job loss or
 * illness strikes one person at a random week (uniform in [26, 1500]); a
 * ~52-week recovery regime follows with a lowered set point. Recovery is
 * shorter and can even strengthen intimacy when partner support quality
 * (capitalization + agreeableness) is high — vulnerabilities amplified,
 * adaptation rewarded.
 */
export function makeMajorEvent(cfg: MajorEventConfig = {}): ScenarioModule {
  const count = cfg.count ?? 1
  const kind = cfg.kind ?? 'illness'
  const shockMag = kind === 'illness' ? 5.5 : 4.5
  let persons: [PersonParams, PersonParams] | null = null
  let baseB: [number, number] = [0, 0]
  let neu: [number, number] = [0.3, 0.3]
  let support: [number, number] = [0.5, 0.5]
  let eventWeeks: number[] = []
  let recoveryUntil: [number, number] = [-1, -1]
  let strongSupport: [boolean, boolean] = [false, false]

  return {
    id: 'majorEvent',
    events: [] as EventRecord[],
    setup(ctx) {
      persons = ctx.persons
      eventWeeks = []
      recoveryUntil = [-1, -1] // defensive: reset per run
      strongSupport = [false, false]
      for (let i = 0; i < 2; i++) {
        baseB[i] = persons[i].b
        neu[i] = persons[i].constructs.neu
        const partner = persons[1 - i].constructs
        support[i] = 0.5 * partner.cap + 0.5 * partner.agr
      }
      for (let e = 0; e < count; e++) {
        eventWeeks.push(26 + Math.floor(ctx.rng() * 1474))
      }
      eventWeeks.sort((a, b) => a - b)
    },
    weekly(t: number, state: CoupleState, rng: Rng, mods: WeekMods) {
      const idx = eventWeeks.indexOf(t)
      if (idx >= 0 && persons) {
        const victim = (idx % 2) as PersonIndex
        mods.moodKick[victim] -= shockMag * (1 + 0.5 * neu[victim])
        recoveryUntil[victim] = t + Math.max(8, Math.round(52 * (1 - 0.5 * support[victim])))
        strongSupport[victim] = support[victim] > 0.7
        this.events!.push({ week: t, type: 'stress', who: victim, magnitude: -shockMag, label: kind })
      }
      if (!persons) return
      for (let i = 0; i < 2; i++) {
        if (t < recoveryUntil[i]) {
          persons[i].b = baseB[i] - 1.5 // recovery regime
        } else if (recoveryUntil[i] === t) {
          persons[i].b = baseB[i]
          if (strongSupport[i]) {
            state.intimacy = Math.min(1, state.intimacy + 0.06) // stress-related growth
            this.events!.push({ week: t, type: 'milestone', who: i as PersonIndex, magnitude: 0.8, label: 'post-crisis-growth' })
          }
          recoveryUntil[i] = -1
        }
      }
      mods.externalStress = Math.max(mods.externalStress, recoveryUntil[0] > t || recoveryUntil[1] > t ? 0.35 : 0)
      void rng
    },
  }
}
