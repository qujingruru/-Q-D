/**
 * Single-world simulation engine — Gottman-style coupled weekly dynamics.
 * Deterministic given (seed, persons, init, scenarios): the Monte Carlo pass
 * and the on-demand trajectory replay call this exact function.
 * See plan/model-spec.md §3–§6.
 */
import type {
  CoupleInit,
  CoupleState,
  EndReason,
  EventRecord,
  PersonIndex,
  PersonParams,
  Rng,
  RunDetail,
  RunSummary,
  ScenarioModule,
  TrajectoryPoint,
  WeekMods,
} from '../types'
import { makeNormal, makeRng } from '../sim/rng'
import { influence } from './influence'
import {
  ALTERNATIVES, COMMIT, EVENTS, HAZARD, HORIZON_WEEKS, INIT, INTIMACY,
  INVEST, PASSION, SAT_EMA_ALPHA, TRUST,
} from './constants'

const clamp = (x: number, lo: number, hi: number): number => (x < lo ? lo : x > hi ? hi : x)
const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x))

/**
 * Logistic approximation of the standard normal CDF (max abs error ~0.01) —
 * cheap enough for the per-person-per-week hazard hot path.
 */
export function phi(x: number): number {
  return sigmoid(1.702 * x)
}

export interface SimOptions {
  seed: number
  runIndex?: number
  persons: [PersonParams, PersonParams]
  init: CoupleInit
  scenarios?: ScenarioModule[]
  horizonWeeks?: number
  /** record trajectory + events (replay mode) */
  record?: boolean
  /** inject rng for tests */
  rng?: Rng
}

function initState(persons: [PersonParams, PersonParams], init: CoupleInit): CoupleState {
  const m = init.togetherMonths
  const passion = INIT.passion.base + INIT.passion.hot * Math.exp(-m / INIT.passion.monthsTau)
  const investments = Math.min(INIT.invest.base + m * INIT.invest.monthsW, INIT.invest.cap)
  const stageTrust = INIT.stageTrust[init.stage]
  const trustBase = 0.62 + stageTrust
  const intimacy = clamp(0.32 + Math.min(m / 120, 0.3) + (init.stage === 'passionate' ? 0.06 : 0), 0, 1)
  const sat = init.satisfaction
  const com = sigmoid(INIT.commitment.bias + sat * INIT.commitment.satW)
  return {
    t: 0,
    mood: [sat, sat],
    sat: [sat, sat],
    trust: [
      clamp(trustBase + 0.15 * (persons[0].constructs.agr - 0.5), 0, 1),
      clamp(trustBase + 0.15 * (persons[1].constructs.agr - 0.5), 0, 1),
    ],
    commitment: [com, com],
    alternatives: [ALTERNATIVES.base, ALTERNATIVES.base],
    intimacy,
    passion,
    investments,
    networkSupport: 0.5,
    streakNeg: [0, 0],
    stonewallUntil: [-1, -1],
    chronicLowSince: [-1, -1],
    rebound: [0, 0],
    reconciled: false,
    stonewallWeeks: 0,
    externalWeeks: 0,
    conflictWeeks: 0,
    lastMood: [sat, sat],
  }
}

function baseMods(): WeekMods {
  return {
    conflictRateMul: 1, conflictRateAdd: 0, noveltyMul: 1,
    passionDecayMul: 1, intimacyGrowthMul: 1, trustGrowthMul: 1,
    satBias: 0, moodKick: [0, 0], externalStress: 0, needMismatchMul: 1,
    repairMul: 1, commitmentBonus: [0, 0], trustDelta: [0, 0], notes: {},
  }
}

/** In-place reset (avoids per-week allocation in the hot loop). */
function resetMods(m: WeekMods): void {
  m.conflictRateMul = 1; m.conflictRateAdd = 0; m.noveltyMul = 1
  m.passionDecayMul = 1; m.intimacyGrowthMul = 1; m.trustGrowthMul = 1
  m.satBias = 0; m.moodKick[0] = 0; m.moodKick[1] = 0; m.externalStress = 0
  m.needMismatchMul = 1; m.repairMul = 1
  m.commitmentBonus[0] = 0; m.commitmentBonus[1] = 0
  m.trustDelta[0] = 0; m.trustDelta[1] = 0
}

/** Run one parallel world. Always returns the summary; details when record=true. */
export function simulateRun(opts: SimOptions): RunDetail {
  const rng = opts.rng ?? makeRng(opts.seed)
  const normal = makeNormal(rng)
  const horizon = opts.horizonWeeks ?? HORIZON_WEEKS
  // clone per run: scenario setup() may mutate b/sigma (e.g. financial stress)
  const persons: [PersonParams, PersonParams] = [{ ...opts.persons[0] }, { ...opts.persons[1] }]
  const scenarios = opts.scenarios ?? []
  const state = initState(persons, opts.init)
  const mods = baseMods()
  const trajectory: TrajectoryPoint[] = []
  const events: EventRecord[] = []
  const record = opts.record === true

  for (const sc of scenarios) sc.setup?.({ persons, state, rng })

  let dramaScore = 0
  let endReason: EndReason = 'censored'
  let leaver: PersonIndex | null = null
  let broke = false

  // accumulated shocks applied to this week's mood update
  const shock: [number, number] = [0, 0]
  const c = [persons[0].constructs, persons[1].constructs]

  for (let t = 0; t < horizon && !broke; t++) {
    state.t = t
    // -- reset weekly mods, then let scenarios contribute -------------------
    resetMods(mods)
    for (const sc of scenarios) sc.weekly?.(t, state, rng, mods)
    // drain scenario-emitted story events (replay mode only)
    if (record) {
      for (const sc of scenarios) {
        if (sc.events && sc.events.length > 0) {
          events.push(...sc.events)
          sc.events.length = 0
        }
      }
    } else {
      for (const sc of scenarios) if (sc.events) sc.events.length = 0
    }
    if (mods.externalStress > 0.15) state.externalWeeks++

    // -- stonewalling state machine (reacts to last week's partner mood) ----
    const stonewalling: [boolean, boolean] = [false, false]
    for (let i = 0; i < 2; i++) {
      if (state.lastMood[1 - i] < -persons[i].nT) state.streakNeg[i]++
      else state.streakNeg[i] = 0
      if (state.streakNeg[i] >= EVENTS.stonewall.triggerStreak) {
        state.stonewallUntil[i] = t + EVENTS.stonewall.baseWeeks + EVENTS.stonewall.weeksW * c[i].stonewall
        state.streakNeg[i] = 0
      }
      if (t < state.stonewallUntil[i]) {
        stonewalling[i] = true
        state.stonewallWeeks++
        shock[i] -= EVENTS.stonewall.moodDrag
      }
    }

    // -- endogenous events ---------------------------------------------------
    const anxAvg = 0.5 * (c[0].anx + c[1].anx)
    const agrAvg = 0.5 * (c[0].agr + c[1].agr)
    const neuAvg = 0.5 * (c[0].neu + c[1].neu)
    const conflictRate = clamp(
      EVENTS.conflict.base + EVENTS.conflict.stressW * mods.externalStress + EVENTS.conflict.neuW * neuAvg + EVENTS.conflict.agrW * agrAvg + EVENTS.conflict.avoW * (0.5 * (c[0].avo + c[1].avo)) + mods.conflictRateAdd,
      0, EVENTS.conflict.cap,
    ) * mods.conflictRateMul
    let conflict = false
    let repaired = false
    if (rng() < conflictRate) {
      conflict = true
      state.conflictWeeks++
      const attacker: PersonIndex = rng() < 0.5 ? 0 : 1
      for (let i = 0 as PersonIndex; i < 2; i++) {
        shock[i] += -(EVENTS.conflictShock.base + EVENTS.conflictShock.escalateW * c[attacker].escalate + EVENTS.conflictShock.neuW * c[i].neu)
      }
      let repairer: PersonIndex | null = null
      for (let i = 0; i < 2; i++) {
        if (rng() < c[i].repair * mods.repairMul) repairer = i as PersonIndex
      }
      if (repairer !== null) {
        repaired = true
        state.trust[repairer] = clamp(state.trust[repairer] + EVENTS.repairGain.trust, 0, 1)
        state.intimacy = clamp(state.intimacy + EVENTS.repairGain.intimacy, 0, 1)
        state.rebound[0] += EVENTS.repairGain.mood
        state.rebound[1] += EVENTS.repairGain.mood
        if (record) events.push({ week: t, type: 'repair', who: repairer, magnitude: 1.5, repaired: true })
      } else {
        shock[0] -= EVENTS.conflictShock.failExtra
        shock[1] -= EVENTS.conflictShock.failExtra
        state.trust[0] = clamp(state.trust[0] - TRUST.unrepairedLoss, 0, 1)
        state.trust[1] = clamp(state.trust[1] - TRUST.unrepairedLoss, 0, 1)
        for (let i = 0; i < 2; i++) {
          if (c[i].stonewall > 0.6 && rng() < EVENTS.stonewall.conflictTriggerP) {
            state.stonewallUntil[i] = t + EVENTS.stonewall.baseWeeks + EVENTS.stonewall.weeksW * c[i].stonewall
          }
        }
      }
      if (record) {
        events.push({ week: t, type: 'conflict', who: attacker, magnitude: -(1.2 + 1.6 * c[attacker].escalate), repaired })
      }
    }

    if (rng() < EVENTS.goodnews.rate) {
      const owner: PersonIndex = rng() < 0.5 ? 0 : 1
      const q = c[1 - owner].cap
      shock[owner] += EVENTS.goodnews.ownerGain + EVENTS.goodnews.goodMul * q + EVENTS.goodnews.badMul * (1 - q)
      state.trust[owner] = clamp(state.trust[owner] + EVENTS.goodnews.trustW * q, 0, 1)
      if (record) events.push({ week: t, type: 'goodnews', who: owner, magnitude: 0.8 + 1.2 * q })
    }

    let noveltyFired = false
    const novAvg = 0.5 * (c[0].nov + c[1].nov)
    const extAvg = 0.5 * (c[0].ext + c[1].ext)
    // draw owner unconditionally: rng consumption must never depend on `record`
    const noveltyOwner: PersonIndex = rng() < 0.5 ? 0 : 1
    if (rng() < (EVENTS.novelty.base + EVENTS.novelty.novW * novAvg + EVENTS.novelty.extW * extAvg) * mods.noveltyMul) {
      noveltyFired = true
      shock[0] += EVENTS.novelty.moodGain
      shock[1] += EVENTS.novelty.moodGain
      if (record) events.push({ week: t, type: 'novelty', who: noveltyOwner, magnitude: 0.8 })
    }

    // need mismatch penalty (amplified by scenarios like LDR / busy careers)
    const needGap = Math.abs(c[0].need - c[1].need) * mods.needMismatchMul
    if (needGap > 0) {
      shock[0] -= 0.1 * needGap
      shock[1] -= 0.1 * needGap
    }

    // -- main mood update (Gottman discrete form, simultaneous update) -------
    const delta = [0, 0]
    for (let i = 0; i < 2; i++) {
      const p = persons[i]
      const infl = influence(p, state.lastMood[1 - i], stonewalling[i])
      const next = clamp(
        p.a * state.mood[i] + (1 - p.a) * p.b + infl + shock[i] + mods.moodKick[i] + state.rebound[i] + normal(p.sigma),
        -10, 10,
      )
      delta[i] = next - state.mood[i]
      state.lastMood[i] = state.mood[i]
      state.mood[i] = next
      state.rebound[i] = 0
      // perceived satisfaction EMA (with idealization bias)
      state.sat[i] = clamp(state.sat[i] + (next + mods.satBias - state.sat[i]) * SAT_EMA_ALPHA, -10, 10)
      // chronic low tracking
      if (state.sat[i] < HAZARD.chronicSatBelow) {
        if (state.chronicLowSince[i] < 0) state.chronicLowSince[i] = t
      } else {
        state.chronicLowSince[i] = -1
      }
    }
    shock[0] = 0
    shock[1] = 0

    // -- slow variables ------------------------------------------------------
    const capAvg = 0.5 * (c[0].cap + c[1].cap)
    const repairAvg = 0.5 * (c[0].repair + c[1].repair)
    state.intimacy = clamp(
      state.intimacy
        + INTIMACY.gain * ((state.sat[0] + state.sat[1]) / 4) * (INTIMACY.capW + INTIMACY.capW2 * capAvg) * mods.intimacyGrowthMul
        - INTIMACY.conflictLoss * (conflict ? 1 - repairAvg : 0),
      0, 1,
    )
    const lambda = PASSION.decay * (1 - PASSION.anxDamp * anxAvg) * mods.passionDecayMul
    state.passion = clamp(state.passion - lambda * (state.passion - PASSION.floor) + (noveltyFired ? PASSION.noveltyGain : 0), 0, 1)
    for (let i = 0; i < 2; i++) {
      const infl = influence(persons[i], state.lastMood[1 - i], stonewalling[i])
      if (infl > 0) state.trust[i] = clamp(state.trust[i] + TRUST.posGain * mods.trustGrowthMul, 0, 1)
      // slow mean reversion keeps trust responsive to ongoing behaviour
      state.trust[i] = clamp(state.trust[i] + (TRUST.center - state.trust[i]) * TRUST.decay + mods.trustDelta[i], 0, 1)
    }
    state.investments = Math.min(state.investments + INVEST.weeklyGain, INVEST.max)
    for (let i = 0; i < 2; i++) {
      const target = ALTERNATIVES.base + ALTERNATIVES.dissatW * (1 - (state.sat[i] + 10) / 20)
      state.alternatives[i] += (target - state.alternatives[i]) * ALTERNATIVES.rate
      state.commitment[i] = clamp(
        sigmoid(
          COMMIT.satW * (state.sat[i] / COMMIT.satScale) + COMMIT.investW * state.investments
          - COMMIT.altW * state.alternatives[i] + COMMIT.networkW * state.networkSupport
          + COMMIT.intimacyW * state.intimacy
          - COMMIT.trustW * (COMMIT.trustCenter - state.trust[i]) + COMMIT.bias,
        ) + mods.commitmentBonus[i],
        0.001, 0.999,
      )
    }

    // -- breakup hazard & impulsive exit -------------------------------------
    for (let i = 0; i < 2 && !broke; i++) {
      const chronic = state.chronicLowSince[i] >= 0 && t - state.chronicLowSince[i] >= HAZARD.chronicWeeks ? 1 : 0
      const h = Math.max(HAZARD.hFloor,
        HAZARD.h0 * phi(-(state.commitment[i] - HAZARD.kappa) * HAZARD.steep) * (1 + HAZARD.chronicMul * chronic))
      if (h > HAZARD.dramaFrac * HAZARD.h0) dramaScore++
      if (rng() < h) {
        broke = true
        leaver = i as PersonIndex
        endReason = classifyEnd(state, t)
      }
    }
    if (!broke) {
      for (let i = 0; i < 2 && !broke; i++) {
        if (Math.abs(delta[i]) > EVENTS.impulsive.dropAbove && state.mood[i] < EVENTS.impulsive.moodBelow) {
          const pImp = EVENTS.impulsive.p * c[i].neu * c[i].anx
          if (rng() < pImp) {
            const partnerCommit = state.commitment[1 - i]
            if (!state.reconciled && partnerCommit > EVENTS.impulsive.reconcileCommit && rng() < EVENTS.impulsive.reconcileP) {
              state.reconciled = true
              state.intimacy = clamp(state.intimacy - 0.1, 0, 1)
              if (record) events.push({ week: t, type: 'nearbreakup', who: i as PersonIndex, magnitude: -2 })
            } else {
              broke = true
              leaver = i as PersonIndex
              endReason = 'impulsive'
            }
          }
        }
      }
    }

    if (record && t % 2 === 0) {
      trajectory.push({
        week: t,
        moodQ: state.mood[0], moodD: state.mood[1],
        satQ: state.sat[0], satD: state.sat[1],
        comQ: state.commitment[0], comD: state.commitment[1],
        passion: state.passion, intimacy: state.intimacy,
      })
    }
  }

  const durationWeeks = broke ? state.t : horizon
  const summary: RunSummary = {
    runIndex: opts.runIndex ?? -1,
    seed: opts.seed,
    durationWeeks,
    survived: !broke,
    endReason,
    leaver,
    dramaScore,
  }
  return { summary, trajectory, events }
}

function classifyEnd(s: CoupleState, t: number): EndReason {
  if (t <= 0) return 'exhaustion'
  if (s.stonewallWeeks / t > 0.25) return 'stonewall'
  if (s.externalWeeks / t > 0.3) return 'external'
  return 'exhaustion'
}

/** Convenience: summary-only run (Monte Carlo hot path). */
export function simulateSummary(opts: SimOptions): RunSummary {
  return simulateRun(opts).summary
}
