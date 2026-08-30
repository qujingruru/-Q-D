/**
 * Seeded draw of one item per construct (12 screens), with shuffled choice
 * options. Same session seed → same questionnaire (shareable/replayable);
 * different seed → fresh surface wording.
 */
import { CONSTRUCTS, type ConstructDef, type Item } from './constructs'
import type { Constructs, Rng } from '../types'
export type { Constructs }

export interface DrawnItem {
  constructId: keyof Constructs
  constructLabel: string
  item: Item
}

/** Likert 1–5 answer → normalized 0..1 construct contribution. */
export function likertScore(answer: number, reverse: boolean): number {
  const norm = (answer - 1) / 4 // 1..5 → 0..1
  return reverse ? 1 - norm : norm
}

/** Draw one item per construct; shuffles choice options deterministically. */
export function drawQuestionnaire(rng: Rng): DrawnItem[] {
  const out: DrawnItem[] = []
  for (const def of CONSTRUCTS) {
    const item = def.items[Math.floor(rng() * def.items.length)]
    out.push({
      constructId: def.id,
      constructLabel: def.label,
      item: shuffleItem(item, rng),
    })
  }
  // shuffle screen order too (keeps constructs covered, varies the flow)
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function shuffleItem(item: Item, rng: Rng): Item {
  if (item.kind !== 'choice') return item
  const options = [...item.options]
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[options[i], options[j]] = [options[j], options[i]]
  }
  return { ...item, options }
}

/**
 * Convert dual answers (小Q, 小D) per drawn item → normalized constructs.
 * Choice answers are option indices; likert answers are 1..5.
 */
export type Answer = number

export function scoreAnswers(items: DrawnItem[], answersQ: Answer[], answersD: Answer[]): [Constructs, Constructs] {
  const q = blankConstructs()
  const d = blankConstructs()
  items.forEach((drawn, i) => {
    const construct = CONSTRUCTS.find((c) => c.id === drawn.constructId) as ConstructDef
    q[drawn.constructId] = scoreOne(drawn.item, answersQ[i])
    d[drawn.constructId] = scoreOne(drawn.item, answersD[i])
    void construct
  })
  return [q, d]
}

function scoreOne(item: Item, answer: Answer): number {
  if (item.kind === 'likert') {
    return clamp01(likertScore(Math.round(answer), item.reverse === true))
  }
  const opt = item.options[Math.round(answer)]
  return clamp01(opt ? opt.score : 0.5)
}

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x)

/**
 * Derive per-item answers that reproduce a persona's construct profile —
 * used by single-player mode (小D preset) and preset quick starts.
 * Likert: construct 0..1 → anchor 1..5 (reverse items inverted).
 * Choice: the option whose score is closest to the persona's construct.
 */
export function autoAnswers(items: DrawnItem[], c: Constructs): number[] {
  return items.map(({ item, constructId }) => {
    const target = c[constructId]
    if (item.kind === 'likert') {
      const norm = item.reverse === true ? 1 - target : target
      return Math.max(1, Math.min(5, Math.round(norm * 4) + 1))
    }
    let best = 0
    item.options.forEach((o, i) => {
      if (Math.abs(o.score - target) < Math.abs(item.options[best].score - target)) best = i
    })
    return best
  })
}

function blankConstructs(): Constructs {
  return {
    anx: 0.5, avo: 0.5, neu: 0.5, agr: 0.5, con: 0.5, ext: 0.5,
    stonewall: 0.5, escalate: 0.5, repair: 0.5, cap: 0.5, need: 0.5, nov: 0.5,
  }
}
