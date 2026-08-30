import type { PersonIndex, ScenarioModule } from '../../types'

export interface BusyConfig {
  busyPerson?: 'both' | 0 | 1
}

/**
 * ⑦ Busy careers (Greenhaus & Beutell 1985 work–family spillover): less
 * shared time (novelty halved), weekly work-stress spillover kicks (the busy
 * person hit harder), and the intimacy-need mismatch is amplified.
 */
export function makeBusy(cfg: BusyConfig = {}): ScenarioModule {
  const busy = cfg.busyPerson ?? 'both'
  let neu: [number, number] = [0.3, 0.3]
  return {
    id: 'busy',
    weekly(t, state, rng, mods) {
      void t
      void state
      mods.noveltyMul *= 0.5
      mods.needMismatchMul *= 1.5
      if (rng() < 0.15) {
        const targets: PersonIndex[] = busy === 'both' ? [0, 1] : [busy as PersonIndex]
        for (const i of targets) {
          mods.moodKick[i] -= 1.0 * (1 + neu[i])
        }
        const other: PersonIndex[] = busy === 'both' ? [] : [(1 - (busy as number)) as PersonIndex]
        for (const j of other) mods.moodKick[j] -= 0.5
      }
    },
    setup({ persons }) {
      neu = [persons[0].constructs.neu, persons[1].constructs.neu]
    },
  }
}
