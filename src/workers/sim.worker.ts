/// <reference lib="webworker" />
/**
 * Simulation worker: keeps 10k×2600-week Monte Carlo off the main thread and
 * reports progress batches to drive the "ten thousand worlds" loading scene.
 */
import type { CoupleInit, PersonParams, RunSummary } from '../types'
import { monteCarlo } from '../sim/monteCarlo'
import { aggregate, type McResult } from '../report/stats'
import type { ScenarioSelection } from '../model/scenarios'

export interface SimRequest {
  kind: 'run'
  masterSeed: number
  runs: number
  persons: [PersonParams, PersonParams]
  init: CoupleInit
  scenarioSelection?: ScenarioSelection
}

export interface SimProgressMessage {
  kind: 'progress'
  done: number
  total: number
  /** summaries of the just-finished batch (for milestone captions) */
  batch: RunSummary[]
}

export interface SimDoneMessage {
  kind: 'done'
  result: McResult
}

export type SimResponse = SimProgressMessage | SimDoneMessage

self.onmessage = (e: MessageEvent<SimRequest>) => {
  const req = e.data
  if (req.kind !== 'run') return
  const summaries = monteCarlo({
    masterSeed: req.masterSeed,
    runs: req.runs,
    persons: req.persons,
    init: req.init,
    scenarioSelection: req.scenarioSelection,
    batchSize: 250,
    onProgress: (done, total, batch) => {
      const msg: SimProgressMessage = { kind: 'progress', done, total, batch }
      ;(self as unknown as Worker).postMessage(msg)
    },
  })
  const done: SimDoneMessage = { kind: 'done', result: aggregate(summaries) }
  ;(self as unknown as Worker).postMessage(done)
}
