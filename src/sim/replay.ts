/**
 * Deterministic replay of a single world — full trajectory + event log for
 * the trajectory explorer and the story generator. Reuses the exact engine
 * path (and a fresh scenario instance, matching monteCarlo) so the replay is
 * guaranteed identical to the MC run.
 */
import type { CoupleInit, EventRecord, PersonParams, RunDetail, RunSummary, TrajectoryPoint } from '../types'
import { simulateRun } from '../model/engine'
import { buildScenarios, type ScenarioSelection } from '../model/scenarios'

export interface ReplayOptions {
  summary: RunSummary
  persons: [PersonParams, PersonParams]
  init: CoupleInit
  scenarioSelection?: ScenarioSelection
}

export function replayWorld(opts: ReplayOptions): RunDetail {
  const detail = simulateRun({
    seed: opts.summary.seed,
    runIndex: opts.summary.runIndex,
    persons: opts.persons,
    init: opts.init,
    scenarios: buildScenarios(opts.scenarioSelection ?? {}),
    record: true,
  })
  return detail
}

/** Downsample a trajectory for lightweight chart payloads. */
export function downsample(tr: TrajectoryPoint[], maxPoints: number): TrajectoryPoint[] {
  if (tr.length <= maxPoints) return tr
  const step = Math.ceil(tr.length / maxPoints)
  const out: TrajectoryPoint[] = []
  for (let i = 0; i < tr.length; i += step) out.push(tr[i])
  if (out[out.length - 1] !== tr[tr.length - 1]) out.push(tr[tr.length - 1])
  return out
}

/** Pick the K most story-worthy events (impact-ranked, time-ordered). */
export function topEvents(events: EventRecord[], k: number): EventRecord[] {
  return [...events]
    .sort((a, b) => Math.abs(b.magnitude) - Math.abs(a.magnitude))
    .slice(0, k)
    .sort((a, b) => a.week - b.week)
}
