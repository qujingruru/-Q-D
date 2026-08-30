/**
 * Core domain types for the Little Q & Little D relationship simulation engine.
 * See plan/model-spec.md for the authoritative design and literature anchors.
 */

/** Normalized construct scores from the questionnaire, all in [0,1]. */
export interface Constructs {
  /** attachment anxiety (ECR-R mini) */
  anx: number
  /** attachment avoidance (ECR-R mini) */
  avo: number
  /** neuroticism / emotional instability (TIPI-style) */
  neu: number
  /** agreeableness */
  agr: number
  /** conscientiousness */
  con: number
  /** extraversion */
  ext: number
  /** conflict style: stonewalling tendency */
  stonewall: number
  /** conflict style: escalation (criticism/contempt direction) */
  escalate: number
  /** repair attempt skill/willingness (Gottman) */
  repair: number
  /** capitalization: active-constructive responding to good news (Gable) */
  cap: number
  /** intimacy need expressiveness */
  need: number
  /** novelty seeking (self-expansion, Aron) */
  nov: number
}

/** Derived per-person engine parameters (mapping formulas in model-spec §3). */
export interface PersonParams {
  constructs: Constructs
  /** uninfluenced set point */
  b: number
  /** inertia */
  a: number
  /** weekly noise sd */
  sigma: number
  /** influence function: positive threshold / slope */
  pT: number
  pS: number
  /** influence function: negative threshold / slope */
  nT: number
  nS: number
}

export type PersonIndex = 0 | 1

export type EndReason =
  | 'exhaustion' // 慢性消耗
  | 'impulsive' // 一次盛怒中的告别
  | 'stonewall' // 输给了沉默
  | 'external' // 被生活压垮
  | 'censored' // 白头偕老（存活至视野末端）

/** Compact per-run record stored by Monte Carlo (kept tiny: ~10k of these). */
export interface RunSummary {
  runIndex: number
  seed: number
  durationWeeks: number
  survived: boolean
  endReason: EndReason
  /** which person left, null if censored */
  leaver: PersonIndex | null
  /** count of survived high-hazard weeks (miracle-world curation) */
  dramaScore: number
}

export type EventType =
  | 'conflict'
  | 'repair'
  | 'goodnews'
  | 'novelty'
  | 'stress'
  | 'milestone'
  | 'reunion'
  | 'nearbreakup'
  | 'rare'

export interface EventRecord {
  week: number
  type: EventType
  /** person the event centres on (initiator / owner / victim) */
  who: PersonIndex
  /** signed magnitude for story ranking */
  magnitude: number
  repaired?: boolean
  /** scenario / flavor key, e.g. 'money', 'illness' */
  label?: string
}

export interface TrajectoryPoint {
  week: number
  moodQ: number
  moodD: number
  satQ: number
  satD: number
  comQ: number
  comD: number
  passion: number
  intimacy: number
}

/** Full-fidelity replay output (only produced on demand via recorded runs). */
export interface RunDetail {
  summary: RunSummary
  trajectory: TrajectoryPoint[]
  events: EventRecord[]
}

export type Stage = 'ambiguous' | 'passionate' | 'steady'

/** Relationship-current-conditions questionnaire answers → initial state. */
export interface CoupleInit {
  togetherMonths: number
  stage: Stage
  /** current satisfaction mapped to [-2.5, 2.5] */
  satisfaction: number
}

/** Mutable weekly couple state (engine-internal). */
export interface CoupleState {
  t: number
  mood: [number, number]
  sat: [number, number]
  trust: [number, number]
  commitment: [number, number]
  alternatives: [number, number]
  intimacy: number
  passion: number
  investments: number
  networkSupport: number
  /** consecutive weeks partner mood below -nT_i (stonewalling trigger) */
  streakNeg: [number, number]
  /** week until which person i is stonewalling */
  stonewallUntil: [number, number]
  /** week since which sat_i < -1 continuously (chronic low), -1 = none */
  chronicLowSince: [number, number]
  /** repair rebound applied at next week's update */
  rebound: [number, number]
  /** one-shot reconciliation already used (Dailey on/off) */
  reconciled: boolean
  // lifetime counters for endReason classification
  stonewallWeeks: number
  externalWeeks: number
  conflictWeeks: number
  lastMood: [number, number]
}

/**
 * Weekly modifiers contributed by scenario modules (M4). The engine owns the
 * object and resets it to base each week; scenarios mutate fields.
 */
export interface WeekMods {
  conflictRateMul: number
  conflictRateAdd: number
  noveltyMul: number
  passionDecayMul: number
  intimacyGrowthMul: number
  trustGrowthMul: number
  /** idealization bias added to perceived mood before the satisfaction EMA */
  satBias: number
  /** weekly mood kicks (stress spillover etc.) */
  moodKick: [number, number]
  /** 0..1 external stress marker (conflict rate + endReason classification) */
  externalStress: number
  needMismatchMul: number
  repairMul: number
  commitmentBonus: [number, number]
  trustDelta: [number, number]
  /** accumulate one-time info for narratives (e.g. accumulated LDR bias) */
  notes: Record<string, number>
}

/** Composable scenario module contract (implemented in model/scenarios/, M4). */
export interface ScenarioModule {
  id: string
  /** one-time setup before the loop (may modify param copies / schedule) */
  setup?: (ctx: { persons: [PersonParams, PersonParams]; state: CoupleState; rng: Rng }) => void
  /** per-week hook: mutate mods (called with base values each week) */
  weekly?: (
    t: number,
    state: CoupleState,
    rng: Rng,
    mods: WeekMods,
  ) => void
  /** story events the module pushes; the engine drains this each week */
  events?: EventRecord[]
}

/** Uniform [0,1) generator contract (xoshiro128** in sim/rng.ts). */
export type Rng = () => number
