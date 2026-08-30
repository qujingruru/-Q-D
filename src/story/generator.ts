/**
 * Story generator: replay a world → select the most story-worthy nodes →
 * fill templates → a short Chinese narrative paragraph. Same seed always
 * produces the same story.
 */
import type { EventRecord, RunDetail } from '../types'
import { CLOSING, EVENT_TEMPLATES, OPENING, pickVariant, stressLabel, type StoryKind, type TemplateCtx } from './templates'

export interface StoryInput {
  detail: RunDetail
  kind: StoryKind
  names: [string, string]
}

export interface Story {
  /** narrative sentences in order */
  lines: string[]
  /** display duration for the card */
  years: number
  survived: boolean
  endReason: string
  /** hidden rare ending easter egg (<1% of eligible worlds) */
  rare?: boolean
}

const YEAR = (week: number): number => Math.max(1, Math.round(week / 52))

/** events worth narrating, capped and deduplicated in time */
function selectEvents(events: EventRecord[], max = 6): EventRecord[] {
  // prefer special events; then rank by |magnitude|
  const weight = (e: EventRecord): number => {
    let w = Math.abs(e.magnitude)
    if (e.type === 'nearbreakup' || e.type === 'reunion' || e.type === 'rare') w += 2.5
    if (e.type === 'milestone') w += 1.2
    if (e.type === 'repair') w += 0.8
    if (e.repaired) w += 0.6
    return w
  }
  const ranked = [...events].sort((a, b) => weight(b) - weight(a))
  const chosen: EventRecord[] = []
  let lastWeek = -99
  for (const e of ranked) {
    if (chosen.length >= max) break
    // dedupe: at most one event per ~26 weeks, keep chronological spread
    if (Math.abs(e.week - lastWeek) < 26 && chosen.length > 0) continue
    chosen.push(e)
    lastWeek = e.week
  }
  return chosen.sort((a, b) => a.week - b.week)
}

function templateKey(e: EventRecord): string {
  switch (e.type) {
    case 'conflict':
      return e.repaired ? 'conflict+repaired' : 'conflict'
    case 'stress':
      return `stress:${e.label ?? 'generic'}`
    case 'milestone':
      return `milestone:${e.label ?? 'generic'}`
    default:
      return e.type
  }
}

function fill(tpl: string, ctx: TemplateCtx, extra: Record<string, string> = {}): string {
  const map: Record<string, string> = {
    who: ctx.who,
    other: ctx.other,
    year: String(ctx.year),
    ...extra,
  }
  return tpl.replace(/\{(\w+)\}/g, (_, k: string) => map[k] ?? '')
}

export function generateStory(input: StoryInput): Story {
  const { detail, kind, names } = input
  const { summary, events } = detail
  const seed = summary.seed

  const lines: string[] = []
  lines.push(pickVariant(OPENING[kind], seed, 1))

  // hidden rare ending: <1% of worlds carry an extra easter-egg sentence
  const rare = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) >>> 0
  const hasRare = rare % 200 === 0 && summary.durationWeeks > 52 * 10
  const pool = hasRare
    ? [...events, { week: Math.floor(summary.durationWeeks * 0.62), type: 'rare' as const, who: (rare % 2) as 0 | 1, magnitude: 2.2 }]
    : events

  const chosen = selectEvents(pool)
  chosen.forEach((ev, i) => {
    const who = names[ev.who]
    const other = names[1 - ev.who]
    const ctx: TemplateCtx = { qName: names[0], dName: names[1], who, other, year: YEAR(ev.week), week: ev.week, ev }
    const key = templateKey(ev)
    const variants = EVENT_TEMPLATES[key] ?? EVENT_TEMPLATES[ev.type]
    if (!variants || variants.length === 0) return
    const tpl = pickVariant(variants, seed, 11 + i * 7)
    lines.push(fill(tpl, ctx, { stress: stressLabel(ev.label) }))
  })

  const years = Math.max(1, Math.round(summary.durationWeeks / 52))
  const months = Math.max(1, Math.round(summary.durationWeeks / 4.33))
  const endYear = summary.durationWeeks < 52 ? months / 12 : years
  const closing = pickVariant(CLOSING[kind], seed, 97)
  lines.push(
    fill(closing, { qName: names[0], dName: names[1], who: names[0], other: names[1], year: years, week: 0, ev: chosen[0] ?? ({ week: 0, type: 'conflict', who: 0, magnitude: 0 } as EventRecord) },
      { years: String(years), endYear: endYear.toFixed(endYear < 10 ? 1 : 0) }),
  )

  return { lines, years, survived: summary.survived, endReason: summary.endReason, rare: hasRare }
}
