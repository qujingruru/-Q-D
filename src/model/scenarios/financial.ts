import type { EventRecord, ScenarioModule } from '../../types'

export interface FinancialConfig {
  /** severity 0..1, default 0.6 */
  severity?: number
}

/**
 * ③ Financial stress (Conger et al., Family Stress Model): chronic strain —
 * lowered set points, amplified noise, more (money) conflicts, and degraded
 * repair (self-control depletion).
 */
export function makeFinancial(cfg: FinancialConfig = {}): ScenarioModule {
  const f = cfg.severity ?? 0.6
  return {
    id: 'financial',
    events: [] as EventRecord[],
    setup({ persons }) {
      for (const p of persons) {
        p.b -= 1.3 * f
        p.sigma *= 1 + 0.6 * f
      }
    },
    weekly(_t, _state, _rng, mods) {
      mods.repairMul *= 1 - 0.3 * f
      mods.conflictRateAdd += 0.07 * f
      mods.externalStress = Math.max(mods.externalStress, 0.4 * f)
    },
  }
}
