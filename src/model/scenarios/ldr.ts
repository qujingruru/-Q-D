import type { CoupleState, EventRecord, Rng, ScenarioModule, WeekMods } from '../../types'

export interface LdrConfig {
  /** weeks apart before reunion (default 2 years) */
  durationWeeks?: number
}

/**
 * ① Long-distance + reunion shock (Stafford & Merolla 2007; Stafford, Merolla
 * & Castle 2006): while apart, fewer conflicts but idealization inflates
 * perceived satisfaction; on reunion the bias collapses and conflicts spike
 * for ~12 weeks — reproducing the "1/3 break up within 3 months" pattern.
 */
export function makeLdr(cfg: LdrConfig = {}): ScenarioModule {
  const apart = cfg.durationWeeks ?? 104
  let biasPerWeek = 0
  let accumulatedBias = 0
  return {
    id: 'ldr',
    events: [] as EventRecord[],
    setup({ persons, rng }) {
      const avoAvg = 0.5 * (persons[0].constructs.avo + persons[1].constructs.avo)
      const anxAvg = 0.5 * (persons[0].constructs.anx + persons[1].constructs.anx)
      biasPerWeek = 0.9 * (0.4 + 0.4 * avoAvg + 0.3 * anxAvg)
      accumulatedBias = 0 // defensive: module instances must never leak state
      if (apart < 26 || apart > 208) throw new Error('ldr durationWeeks out of range')
      void rng
    },
    weekly(t: number, state: CoupleState, rng: Rng, mods: WeekMods) {
      if (t < apart) {
        mods.conflictRateMul *= 0.55
        mods.satBias += biasPerWeek
        accumulatedBias += biasPerWeek
        mods.trustGrowthMul *= 0.4
        mods.intimacyGrowthMul *= 0.3
        mods.passionDecayMul *= 0.6
        mods.noveltyMul *= 0.4
        mods.needMismatchMul *= 1.5
        if (t === 0) this.events!.push({ week: 0, type: 'milestone', who: 0, magnitude: 1, label: 'ldr-start' })
      } else if (t < apart + 12) {
        if (t === apart) {
          // reunion: idealization collapse, proportional to accumulated bias
          const kick = -(2.8 + 1.2 * accumulatedBias)
          mods.moodKick[0] += kick
          mods.moodKick[1] += kick
          mods.trustDelta[0] -= 0.05
          mods.trustDelta[1] -= 0.05
          this.events!.push({ week: t, type: 'reunion', who: rng() < 0.5 ? 0 : 1, magnitude: kick, label: 'ldr-reunion' })
        }
        mods.conflictRateMul *= 2.2
      }
      void state
    },
  }
}
