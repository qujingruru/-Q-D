import type { EventRecord, ScenarioModule } from '../../types'

export interface CohabitationConfig {
  atWeek?: number
  /** override the "decided vs sliding" classification (UI derives it from commitment) */
  decided?: boolean
}

/**
 * ⑤ Moving in together (Huston et al. 2001 PAIR disillusionment; Stanley,
 * Rhoades & Markman 2006 sliding-vs-deciding): a 52-week adjustment regime
 * with more friction and faster passion decay, plus a disillusionment shock
 * proportional to the idealization gap. High-commitment ("decided") movers
 * take half the damage; investments jump at move-in.
 */
export function makeCohabitation(cfg: CohabitationConfig = {}): ScenarioModule {
  const atWeek = cfg.atWeek ?? 26
  const regime = 52
  let decided = cfg.decided
  let idealizationGap = 0
  return {
    id: 'cohabitation',
    events: [] as EventRecord[],
    setup({ persons }) {
      const avoAvg = 0.5 * (persons[0].constructs.avo + persons[1].constructs.avo)
      const anxAvg = 0.5 * (persons[0].constructs.anx + persons[1].constructs.anx)
      idealizationGap = 0.5 * ((1 - avoAvg) + anxAvg)
      decided = cfg.decided // defensive: re-derive per run unless overridden
    },
    weekly(t, state, _rng, mods) {
      if (t === atWeek) {
        if (decided === undefined) {
          decided = 0.5 * (state.commitment[0] + state.commitment[1]) > 0.7
        }
        // decided movers gain investment and certainty; sliders carry ambiguity
        state.investments = Math.min(2.5, state.investments + (decided ? 0.6 : 0.2))
        const trustShift = decided ? 0.04 : -0.12
        state.trust[0] = Math.max(0, Math.min(1, state.trust[0] + trustShift))
        state.trust[1] = Math.max(0, Math.min(1, state.trust[1] + trustShift))
        this.events!.push({ week: t, type: 'milestone', who: 0, magnitude: 0.6, label: 'cohabit' })
      }
      if (t > atWeek && t <= atWeek + regime) {
        // sliding movers carry doubts through the regime; decided movers certainty
        mods.conflictRateMul *= decided ? 1.15 : 1.7
        mods.passionDecayMul *= 1.3
        mods.commitmentBonus[0] += decided ? 0.08 : -0.25
        mods.commitmentBonus[1] += decided ? 0.08 : -0.25
        if (t === atWeek + 4) {
          const kick = -(2.5 + 3 * idealizationGap) * (decided ? 0.5 : 1.4)
          mods.moodKick[0] += kick
          mods.moodKick[1] += kick
          this.events!.push({ week: t, type: 'stress', who: 0, magnitude: kick, label: 'disillusionment' })
        }
      }
    },
  }
}
