import { describe, expect, it } from 'vitest'
import { CONSTRUCTS, RELATIONSHIP_QUESTIONS } from '../src/questionnaire/constructs'
import { drawQuestionnaire, scoreAnswers } from '../src/questionnaire/draw'
import { makeRng } from '../src/sim/rng'

describe('question bank', () => {
  it('covers exactly the 12 constructs with 2+ variants each', () => {
    expect(CONSTRUCTS.length).toBe(12)
    expect(new Set(CONSTRUCTS.map((c) => c.id)).size).toBe(12)
    for (const c of CONSTRUCTS) {
      expect(c.items.length).toBeGreaterThanOrEqual(2)
      expect(c.label.length).toBeGreaterThan(0)
    }
    expect(RELATIONSHIP_QUESTIONS.length).toBe(3)
  })
})

describe('seeded draw', () => {
  it('always covers all 12 constructs exactly once', () => {
    for (const seed of [1, 7, 42, 99, 12345]) {
      const drawn = drawQuestionnaire(makeRng(seed))
      expect(drawn.length).toBe(12)
      const ids = drawn.map((d) => d.constructId)
      expect(new Set(ids).size).toBe(12)
    }
  })

  it('is reproducible per seed and varies across seeds', () => {
    const a = drawQuestionnaire(makeRng(100))
    const b = drawQuestionnaire(makeRng(100))
    expect(a.map((d) => d.item.text)).toEqual(b.map((d) => d.item.text))
    // across seeds, at least some items differ (fresh surface)
    const c = drawQuestionnaire(makeRng(999))
    const same = a.filter((d, i) => d.item.text === c[i].item.text).length
    expect(same).toBeLessThan(12)
  })
})

describe('scoring', () => {
  it('maps likert and choice answers into [0,1] with expected direction', () => {
    const drawn = drawQuestionnaire(makeRng(5))
    // construct-maximizing vs construct-minimizing answer sets
    const maxAns = drawn.map((d) =>
      d.item.kind === 'likert' ? (d.item.reverse ? 1 : 5) : bestOption(d.item),
    )
    const minAns = drawn.map((d) =>
      d.item.kind === 'likert' ? (d.item.reverse ? 5 : 1) : worstOption(d.item),
    )
    const [qHi] = scoreAnswers(drawn, maxAns, maxAns)
    const [qLo] = scoreAnswers(drawn, minAns, minAns)
    for (const key of Object.keys(qHi) as Array<keyof typeof qHi>) {
      expect(qHi[key]).toBeGreaterThanOrEqual(qLo[key])
      expect(qHi[key]).toBeLessThanOrEqual(1)
      expect(qLo[key]).toBeGreaterThanOrEqual(0)
    }
  })

  it('scores the two persons independently', () => {
    const drawn = drawQuestionnaire(makeRng(6))
    const a = drawn.map((d) => (d.item.kind === 'likert' ? 2 : 0))
    const b = drawn.map((d) => (d.item.kind === 'likert' ? 4 : d.item.kind === 'choice' ? d.item.options.length - 1 : 0))
    const [q, dd] = scoreAnswers(drawn, a, b)
    expect(q).not.toEqual(dd)
  })
})

// helpers: find option index with max/min score for a choice item
function bestOption(item: { kind: string; options?: Array<{ score: number }> }): number {
  if (item.kind !== 'choice') return 0
  return item.options!.reduce((best, o, i) => (o.score > item.options![best].score ? i : best), 0)
}
function worstOption(item: { kind: string; options?: Array<{ score: number }> }): number {
  if (item.kind !== 'choice') return 0
  return item.options!.reduce((worst, o, i) => (o.score < item.options![worst].score ? i : worst), 0)
}
