import type { CoupleState, EventRecord, Rng, ScenarioModule, WeekMods } from '../../types'

export interface ParentalConfig {
  /** opposition intensity 0..1, default 0.7 */
  intensity?: number
}

/**
 * ② Parental opposition (Sinclair, Hood & Wright 2014 — the failed
 * replication of the Romeo & Juliet effect): a short ~26-week unity boost in
 * commitment, then steady erosion of trust and commitment (anxious partners
 * amplify), plus network support loss. Net long-run negative.
 */
export function makeParental(cfg: ParentalConfig = {}): ScenarioModule {
  const k = cfg.intensity ?? 0.7
  let anx: [number, number] = [0.3, 0.3]
  return {
    id: 'parental',
    events: [] as EventRecord[],
    setup({ persons, state }) {
      anx = [persons[0].constructs.anx, persons[1].constructs.anx]
      state.networkSupport = Math.max(0.05, 0.5 - 0.4 * k)
    },
    weekly(t: number, state: CoupleState, rng: Rng, mods: WeekMods) {
      if (t < 26) {
        // transient unity boost (the kernel of truth in the 1972 effect)
        mods.commitmentBonus[0] += 0.18 * k
        mods.commitmentBonus[1] += 0.18 * k
        mods.satBias += 0.25 * k
        if (t === 0) this.events!.push({ week: 0, type: 'stress', who: 0, magnitude: -0.5 * k, label: 'parental-start' })
      } else {
        // long-run erosion (Sinclair et al. 2014 direction)
        mods.trustDelta[0] -= 0.004 * k
        mods.trustDelta[1] -= 0.004 * k
        mods.commitmentBonus[0] -= 0.25 * k * anx[0]
        mods.commitmentBonus[1] -= 0.25 * k * anx[1]
        mods.conflictRateAdd += 0.05 * k
        mods.externalStress = Math.max(mods.externalStress, 0.3 * k)
      }
      void rng
      void state
    },
  }
}
