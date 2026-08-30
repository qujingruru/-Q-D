/**
 * Monte Carlo driver: N seeded worlds with progressive callbacks.
 * Scenario modules are REBUILT per run — they carry mutable closure state, so
 * sharing one instance across runs would leak state and break the
 * MC↔replay determinism guarantee. Progress is reported in batches.
 */
import type { CoupleInit, PersonParams, RunSummary } from '../types'
import { simulateRun } from '../model/engine'
import { runSeed } from './rng'
import { buildScenarios, type ScenarioSelection } from '../model/scenarios'

export interface McOptions {
  masterSeed: number
  runs: number
  persons: [PersonParams, PersonParams]
  init: CoupleInit
  scenarioSelection?: ScenarioSelection
  /** batch size for onProgress callbacks (default 200) */
  batchSize?: number
  /** called after each batch with all summaries so far */
  onProgress?: (done: number, total: number, batch: RunSummary[]) => void
}

export function monteCarlo(opts: McOptions): RunSummary[] {
  const { masterSeed, runs, persons, init, scenarioSelection, batchSize = 200, onProgress } = opts
  const out: RunSummary[] = new Array(runs)
  let batch: RunSummary[] = []
  for (let r = 0; r < runs; r++) {
    // fresh scenario instances each run (state isolation)
    const scenarios = buildScenarios(scenarioSelection ?? {})
    const s = simulateRun({ seed: runSeed(masterSeed, r), runIndex: r, persons, init, scenarios }).summary
    out[r] = s
    batch.push(s)
    if (batch.length >= batchSize || r === runs - 1) {
      onProgress?.(r + 1, runs, batch)
      batch = []
    }
  }
  return out
}
