/**
 * Central calibration constants — single source of truth for tunable values.
 * All numbers are illustrative calibrations; directional claims are anchored
 * to literature (plan/model-spec.md §10).
 */

export const HORIZON_WEEKS = 2600 // 50 years
export const RUNS_DEFAULT = 10000
export const RUNS_FAST = 1000

// §3 person parameter mapping
export const SET_POINT = { base: 0.4, neuW: 3.2, avoW: 2.4, agrW: 0.8, lo: -3, hi: 3 }
export const INERTIA = { base: 0.32, conW: 0.28, neuW: 0.12, lo: 0.3, hi: 0.75 }
export const NOISE = { base: 0.25, neuW: 0.95 }
export const INFLUENCE = {
  pT: 2.0,
  pS: { base: 0.3, anxW: 0.35, extW: 0.15, avoDamp: 0.45 },
  nT: { base: 1.5, avoW: 2.5 },
  nS: { base: 0.45, anxW: 0.75, stonewallW: 0.35 },
}

// §4 slow variables
export const SAT_EMA_ALPHA = 1 / 8
export const INTIMACY = {
  gain: 0.0025,
  capW: 0.6,
  capW2: 1.1,
  conflictLoss: 0.006,
}
export const PASSION = { floor: 0.12, decay: 0.0035, anxDamp: 0.3, noveltyGain: 0.16 }
export const TRUST = { posGain: 0.0006, unrepairedLoss: 0.015, betrayalLoss: 0.02, decay: 0.0012, center: 0.5 }
export const INVEST = { weeklyGain: 0.0009, max: 2.5 }
export const ALTERNATIVES = { base: 0.22, dissatW: 0.3, rate: 0.004 }

// commitment (Rusbult investment model, model-spec §4)
export const COMMIT = {
  satW: 3.2,
  satScale: 5,
  investW: 0.6,
  altW: 1.9,
  networkW: 1.0,
  intimacyW: 1.4,
  trustW: 1.6,
  trustCenter: 0.5,
  bias: -1.2,
}

// breakup hazard
export const HAZARD = {
  h0: 0.0032,
  /** rare-world floor: even happy couples have a small exogenous exit chance */
  hFloor: 4.5e-5,
  kappa: 0.35,
  steep: 3.2,
  chronicMul: 2.5,
  chronicSatBelow: -0.75,
  chronicWeeks: 26,
  dramaFrac: 0.3, // h_i > dramaFrac * h0 counts toward dramaScore
}

// §5 endogenous events
export const EVENTS = {
  conflict: { base: 0.1, stressW: 0.06, neuW: 0.05, agrW: -0.03, avoW: -0.04, cap: 0.6 },
  goodnews: { rate: 0.12, ownerGain: 0.8, goodMul: 1.5, badMul: -1.3, trustW: 0.012 },
  novelty: { base: 0.05, novW: 0.04, extW: 0.03, moodGain: 0.8, intimacyGain: 0.02 },
  conflictShock: { base: 1.5, escalateW: 2.0, neuW: 1.0, failExtra: 1.2 },
  repairGain: { mood: 0.6, trust: 0.01, intimacy: 0.015 },
  stonewall: { triggerStreak: 4, baseWeeks: 4, weeksW: 6, moodDrag: 0.15, inflMul: 0.3, conflictTriggerP: 0.15 },
  impulsive: { p: 0.02, moodBelow: -5, dropAbove: 5, reconcileP: 0.4, reconcileCommit: 0.5 },
}

// §6 initial conditions
export const INIT = {
  passion: { base: 0.15, hot: 0.85, monthsTau: 36 },
  invest: { base: 0.3, monthsW: 1 / 60, cap: 1.1 },
  commitment: { bias: 1.0, satW: 1 / 3 },
  stageTrust: { passionate: 0.05, steady: 0.02, ambiguous: -0.03 },
}
