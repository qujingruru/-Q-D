import type { ScenarioModule } from '../../types'
import { makeLdr, type LdrConfig } from './ldr'
import { makeParental, type ParentalConfig } from './parental'
import { makeFinancial, type FinancialConfig } from './financial'
import { makeMajorEvent, type MajorEventConfig } from './majorEvent'
import { makeCohabitation, type CohabitationConfig } from './cohabitation'
import { makeBaby, type BabyConfig } from './baby'
import { makeBusy, type BusyConfig } from './busy'

export { makeLdr, makeParental, makeFinancial, makeMajorEvent, makeCohabitation, makeBaby, makeBusy }
export type { LdrConfig, ParentalConfig, FinancialConfig, MajorEventConfig, CohabitationConfig, BabyConfig, BusyConfig }

export type ScenarioId = 'ldr' | 'parental' | 'financial' | 'majorEvent' | 'cohabitation' | 'baby' | 'busy'

/** All scenario configs a user can toggle in the S5 gate screen. */
export interface ScenarioSelection {
  ldr?: LdrConfig
  parental?: ParentalConfig
  financial?: FinancialConfig
  majorEvent?: MajorEventConfig
  cohabitation?: CohabitationConfig
  baby?: BabyConfig
  busy?: BusyConfig
}

/** Build the composable module list from a user selection (order fixed). */
export function buildScenarios(sel: ScenarioSelection): ScenarioModule[] {
  const out: ScenarioModule[] = []
  if (sel.ldr) out.push(makeLdr(sel.ldr))
  if (sel.parental) out.push(makeParental(sel.parental))
  if (sel.financial) out.push(makeFinancial(sel.financial))
  if (sel.majorEvent) out.push(makeMajorEvent(sel.majorEvent))
  if (sel.cohabitation) out.push(makeCohabitation(sel.cohabitation))
  if (sel.baby) out.push(makeBaby(sel.baby))
  if (sel.busy) out.push(makeBusy(sel.busy))
  return out
}
