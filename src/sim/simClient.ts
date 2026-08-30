/**
 * Main-thread client for the simulation worker, with an in-thread fallback
 * for environments (some test runners, very old browsers) without workers.
 */
import type { CoupleInit, PersonParams, RunSummary } from '../types'
import type { McResult } from '../report/stats'
import type { SimRequest, SimResponse } from '../workers/sim.worker'
import type { ScenarioSelection } from '../model/scenarios'
import { monteCarlo } from './monteCarlo'
import { aggregate } from '../report/stats'

export interface RunSimulationParams {
  masterSeed: number
  runs: number
  persons: [PersonParams, PersonParams]
  init: CoupleInit
  scenarioSelection?: ScenarioSelection
  onProgress?: (done: number, total: number, batch: RunSummary[]) => void
}

export function runSimulation(params: RunSimulationParams): Promise<McResult> {
  return new Promise((resolve) => {
    let worker: Worker | null = null
    try {
      worker = new Worker(new URL('../workers/sim.worker.ts', import.meta.url), { type: 'module' })
    } catch {
      worker = null
    }
    if (!worker) {
      // fallback: run on the main thread
      const summaries = monteCarlo({
        masterSeed: params.masterSeed,
        runs: params.runs,
        persons: params.persons,
        init: params.init,
        scenarioSelection: params.scenarioSelection,
        onProgress: params.onProgress,
      })
      resolve(aggregate(summaries))
      return
    }
    const w = worker
    w.onmessage = (e: MessageEvent<SimResponse>) => {
      const msg = e.data
      if (msg.kind === 'progress') {
        params.onProgress?.(msg.done, msg.total, msg.batch)
      } else {
        resolve(msg.result)
        w.terminate()
      }
    }
    const req: SimRequest = {
      kind: 'run',
      masterSeed: params.masterSeed,
      runs: params.runs,
      persons: params.persons,
      init: params.init,
      scenarioSelection: params.scenarioSelection ?? {},
    }
    w.postMessage(req)
  })
}
