/**
 * Streaming Monte Carlo aggregation over run summaries.
 * Produces every headline number the report needs — P(>50y), median/mode
 * years, survival curve, distribution histogram, endReason shares — plus the
 * curated "story worlds" (longest / shortest / most dramatic survivor).
 */
import type { EndReason, RunSummary } from '../types'

export interface Bucket {
  years: number
  count: number
}

export interface SurvivalPoint {
  week: number
  /** fraction still together at week */
  s: number
}

export interface CuratedWorlds {
  longest: RunSummary
  shortest: RunSummary
  /** highest dramaScore among 50y survivors (miracle world) */
  miracle: RunSummary | null
  /** longest run that is NOT a survivor — "the closest they ever got" */
  nearMiss: RunSummary | null
}

export interface McResult {
  n: number
  p50y: number
  medianYears: number
  modeYears: number
  survival: SurvivalPoint[]
  histogram: Bucket[]
  endReasons: Array<{ reason: EndReason; share: number }>
  curated: CuratedWorlds
  /** compact per-run arrays for the world map (index → duration/reason) */
  durations: Uint16Array
}

const YEAR_BUCKETS = 50

export function aggregate(summaries: RunSummary[]): McResult {
  const n = summaries.length
  let survived = 0
  for (const s of summaries) if (s.survived) survived++

  // histogram by whole years (censored runs land in the last bucket)
  const hist = new Array<number>(YEAR_BUCKETS + 1).fill(0)
  for (const s of summaries) {
    const y = Math.min(YEAR_BUCKETS, Math.floor(s.durationWeeks / 52))
    hist[y]++
  }
  let modeYears = 0
  let modeCount = -1
  for (let y = 0; y <= YEAR_BUCKETS; y++) {
    if (hist[y] > modeCount) {
      modeCount = hist[y]
      modeYears = y
    }
  }

  // median among non-censored + survivors counted as 50y (Kaplan–Meier style)
  const sorted = summaries.map((s) => s.durationWeeks).sort((a, b) => a - b)
  const medianYears = (sorted[n >> 1] ?? 0) / 52

  // survival curve at yearly resolution + key weekly points
  const survival: SurvivalPoint[] = []
  const alive = new Array<number>(YEAR_BUCKETS + 1).fill(0)
  for (const s of summaries) {
    const yEnd = s.survived ? YEAR_BUCKETS : Math.floor(s.durationWeeks / 52)
    for (let y = 0; y <= yEnd; y++) alive[y]++
  }
  for (let y = 0; y <= YEAR_BUCKETS; y++) survival.push({ week: y * 52, s: alive[y] / n })

  const reasonMap = new Map<EndReason, number>()
  for (const s of summaries) reasonMap.set(s.endReason, (reasonMap.get(s.endReason) ?? 0) + 1)
  const endReasons = [...reasonMap.entries()]
    .map(([reason, count]) => ({ reason, share: count / n }))
    .sort((a, b) => b.share - a.share)

  // curated worlds
  let longest = summaries[0]
  let shortest = summaries[0]
  let miracle: RunSummary | null = null
  let nearMiss: RunSummary | null = null
  for (const s of summaries) {
    if (s.durationWeeks > longest.durationWeeks) longest = s
    if (s.durationWeeks < shortest.durationWeeks) shortest = s
    if (s.survived) {
      if (!miracle || s.dramaScore > miracle.dramaScore) miracle = s
    } else if (!nearMiss || s.durationWeeks > nearMiss.durationWeeks) {
      nearMiss = s
    }
  }

  const durations = new Uint16Array(n)
  summaries.forEach((s, i) => {
    durations[i] = Math.min(65535, s.durationWeeks)
  })

  return {
    n,
    p50y: survived / n,
    medianYears,
    modeYears,
    survival,
    histogram: hist.map((count, years) => ({ years, count })),
    endReasons,
    curated: { longest, shortest, miracle, nearMiss },
    durations,
  }
}

/** Percentile score for the reference pool comparison (model-spec §8). */
export function outcomeScore(r: McResult): number {
  return 0.6 * r.p50y + 0.4 * Math.min(r.medianYears, 50) / 50
}
