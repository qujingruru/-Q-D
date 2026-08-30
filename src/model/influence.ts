import type { PersonParams } from '../types'
import { EVENTS } from './constants'

/**
 * Bilinear influence function (Gottman et al. 2002, The Mathematics of Marriage).
 * Piecewise linear: flat within (-nT, pT), positive slope above pT, negative
 * slope below -nT. Stonewalling dampens received influence.
 */
export function influence(p: PersonParams, partnerMood: number, stonewalling: boolean): number {
  const mul = stonewalling ? EVENTS.stonewall.inflMul : 1
  if (partnerMood >= p.pT) return mul * p.pS * (partnerMood - p.pT)
  if (partnerMood <= -p.nT) return mul * p.nS * (partnerMood + p.nT)
  return 0
}
