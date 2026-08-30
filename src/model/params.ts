import type { Constructs, PersonParams, Rng } from '../types'
import { INERTIA, INFLUENCE, NOISE, SET_POINT } from './constants'

const clamp = (x: number, lo: number, hi: number): number => (x < lo ? lo : x > hi ? hi : x)

/** Map normalized questionnaire constructs to engine parameters (model-spec §3). */
export function constructsToParams(c: Constructs): PersonParams {
  const b = clamp(
    SET_POINT.base + SET_POINT.neuW * (0.5 - c.neu) + SET_POINT.avoW * (0.5 - c.avo) + SET_POINT.agrW * (c.agr - 0.5),
    SET_POINT.lo,
    SET_POINT.hi,
  )
  const a = clamp(INERTIA.base + INERTIA.conW * c.con + INERTIA.neuW * (1 - c.neu), INERTIA.lo, INERTIA.hi)
  const sigma = NOISE.base + NOISE.neuW * c.neu
  const pS = (INFLUENCE.pS.base + INFLUENCE.pS.anxW * c.anx + INFLUENCE.pS.extW * c.ext) * (1 - INFLUENCE.pS.avoDamp * c.avo)
  const nT = INFLUENCE.nT.base + INFLUENCE.nT.avoW * c.avo
  const nS = INFLUENCE.nS.base + INFLUENCE.nS.anxW * c.anx + INFLUENCE.nS.stonewallW * c.stonewall
  return { constructs: c, b, a, sigma, pT: INFLUENCE.pT, pS, nT, nS }
}

const persona = (over: Partial<Constructs>): Constructs => ({
  anx: 0.3, avo: 0.3, neu: 0.35, agr: 0.6, con: 0.6, ext: 0.5,
  stonewall: 0.3, escalate: 0.35, repair: 0.55, cap: 0.6, need: 0.5, nov: 0.5,
  ...over,
})

/** Named preset personas — used for quick start, tests and the reference pool. */
export const PERSONAS: Record<string, { label: string; constructs: Constructs }> = {
  secure: { label: '安全型', constructs: persona({ anx: 0.18, avo: 0.18, neu: 0.28, agr: 0.72, con: 0.7, stonewall: 0.18, escalate: 0.22, repair: 0.82, cap: 0.8 }) },
  anxious: { label: '焦虑型', constructs: persona({ anx: 0.85, avo: 0.25, neu: 0.6, agr: 0.55, stonewall: 0.25, escalate: 0.6, repair: 0.45, cap: 0.55, need: 0.82 }) },
  avoidant: { label: '回避型', constructs: persona({ avo: 0.85, anx: 0.18, neu: 0.42, agr: 0.45, stonewall: 0.8, escalate: 0.2, repair: 0.25, cap: 0.4, need: 0.22 }) },
  volatile: { label: '火山型', constructs: persona({ anx: 0.55, avo: 0.2, neu: 0.55, escalate: 0.85, repair: 0.75, cap: 0.65, nov: 0.7 }) },
  gentle: { label: '温和型', constructs: persona({ anx: 0.25, avo: 0.35, neu: 0.25, agr: 0.82, escalate: 0.15, repair: 0.7, cap: 0.75 }) },
}

/**
 * Random plausible persona for the single-user "fill the other side" mode.
 * Seeded → the same draw is reproducible; reshuffle gives a new stranger.
 */
export function randomConstructs(rng: Rng): Constructs {
  // Uniform draws in a human-plausible band; slight negative coupling between
  // anxiety and avoidance keeps personas from feeling extreme on every axis.
  const jitter = () => 0.15 + 0.7 * rng()
  const anx = jitter()
  const avo = clamp(jitter() - 0.15 * anx, 0.1, 0.9)
  return {
    anx, avo,
    neu: clamp(0.2 + 0.4 * anx + 0.2 * jitter(), 0.1, 0.9),
    agr: jitter(),
    con: jitter(),
    ext: jitter(),
    stonewall: clamp(0.5 * avo + 0.3 * jitter(), 0.1, 0.9),
    escalate: clamp(0.3 * neu_base(anx) + 0.4 * jitter(), 0.1, 0.95),
    repair: jitter(),
    cap: jitter(),
    need: clamp(0.4 + 0.4 * anx - 0.2 * avo, 0.1, 0.9),
    nov: jitter(),
  }
}

// small helper to avoid re-deriving neu coupling inline
function neu_base(anx: number): number {
  return 0.2 + 0.4 * anx
}
