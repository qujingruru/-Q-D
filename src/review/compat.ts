/**
 * 一键复盘 — compatibility review: radar axes + literature-anchored
 * combination rules (fit vs friction), triggered by the couple's actual
 * constructs. Rules table mirrors plan/model-spec.md §review.
 */
import type { Constructs } from '../types'

export interface ReviewAxis {
  label: string
  /** higher = more of the trait; some axes inverted for readability */
  get: (c: Constructs) => number
}

export const RADAR_AXES: ReviewAxis[] = [
  { label: '情绪稳定', get: (c) => 1 - c.neu },
  { label: '安全感', get: (c) => 1 - Math.max(c.anx, c.avo) },
  { label: '温和', get: (c) => c.agr },
  { label: '自律', get: (c) => c.con },
  { label: '修复力', get: (c) => c.repair },
  { label: '回应力', get: (c) => c.cap },
  { label: '亲密渴望', get: (c) => c.need },
  { label: '新鲜感', get: (c) => c.nov },
]

export interface ReviewFinding {
  /** fit = green strength, friction = red risk */
  kind: 'fit' | 'friction'
  text: string
  cite: string
}

interface Rule {
  id: string
  when: (q: Constructs, d: Constructs) => boolean
  fit?: { text: string; cite: string }
  friction?: { text: string; cite: string }
}

const isSecure = (c: Constructs): boolean => c.anx < 0.4 && c.avo < 0.4

const RULES: Rule[] = [
  {
    id: 'pursue-withdraw',
    when: (q, d) => (q.anx > 0.6 && d.avo > 0.55) || (d.anx > 0.6 && q.avo > 0.55),
    friction: {
      text: '一个追、一个逃：{anx}的急切遇上{avo}的退缩，容易形成"追逃循环"——追得越紧，逃得越远。',
      cite: 'Christensen & Shenk (1991) demand–withdraw',
    },
  },
  {
    id: 'double-avoidant',
    when: (q, d) => q.avo > 0.6 && d.avo > 0.6,
    friction: {
      text: '两个人都习惯后退：冲突不多，但问题从不真正解决——这是"平静的疏离"，最安静的消耗。',
      cite: '依恋理论（Hazan & Shaver 1987）',
    },
  },
  {
    id: 'double-anxious',
    when: (q, d) => q.anx > 0.6 && d.anx > 0.6,
    friction: {
      text: '两颗都容易不安的心：情绪互相共振放大，甜蜜时极甜，风浪时是双倍的风浪。',
      cite: '情绪传染（Hatfield et al. 1994）',
    },
  },
  {
    id: 'secure-anchor',
    when: (q, d) => (isSecure(q) && d.anx > 0.55) || (isSecure(d) && q.anx > 0.55),
    fit: {
      text: '{secure}像一只稳定的锚：安全型的从容能接住对方的波澜，研究里这是最稳的搭配之一。',
      cite: '依恋配对研究（Hazan & Shaver 1987）',
    },
  },
  {
    id: 'repair-duo',
    when: (q, d) => q.repair > 0.65 && d.repair > 0.65,
    fit: {
      text: '两个人都愿意先递台阶——修复的意愿比不吵架重要得多，这是关系最强的保护因子之一。',
      cite: 'Gottman 修复尝试（5:1 比率）',
    },
  },
  {
    id: 'low-repair',
    when: (q, d) => q.repair < 0.35 && d.repair < 0.35,
    friction: {
      text: '没有人愿意先低头：裂痕会自己长出利息。争执不可怕，可怕的是争执之后什么都没有发生。',
      cite: 'Gottman 修复尝试研究',
    },
  },
  {
    id: 'cap-match',
    when: (q, d) => q.cap > 0.65 && d.cap > 0.65,
    fit: {
      text: '好消息在他们之间总是被稳稳接住：对彼此喜悦的回应方式，是亲密感最好的日常积攒。',
      cite: 'Gable et al. (2004) capitalization',
    },
  },
  {
    id: 'cap-mismatch',
    when: (q, d) => Math.abs(q.cap - d.cap) > 0.45,
    friction: {
      text: '一个的热情常常落在另一个的忙碌里——"错位的欢喜"日积月累，会让分享的欲望慢慢熄灭。',
      cite: 'Gable et al. (2004)',
    },
  },
  {
    id: 'high-amplitude',
    when: (q, d) => (q.neu > 0.6 || d.neu > 0.6) && (q.escalate > 0.6 || d.escalate > 0.6),
    friction: {
      text: '情绪的大浪遇上急躁的火苗：争吵的振幅容易越推越高，需要有人先学会降温。',
      cite: 'Gottman 四骑士（批评/鄙视）',
    },
  },
  {
    id: 'need-gap',
    when: (q, d) => Math.abs(q.need - d.need) > 0.5,
    friction: {
      text: '对"在一起的时间"的渴望不一样：一个想再近一点，一个觉得刚刚好——需求错位需要说出来才能协商。',
      cite: '亲密需求与关系满意度研究',
    },
  },
  {
    id: 'novelty-duo',
    when: (q, d) => q.nov > 0.6 && d.nov > 0.6,
    fit: {
      text: '两个愿意一起尝新的人：新奇感是长期关系里最便宜也最有效的"再爱一次"按钮。',
      cite: 'Aron 自我扩展理论',
    },
  },
]

/** Generate the review: radar values + triggered findings (fits first). */
export function buildReview(
  names: [string, string],
  q: Constructs,
  d: Constructs,
): { radarQ: number[]; radarD: number[]; findings: ReviewFinding[] } {
  const radarQ = RADAR_AXES.map((a) => a.get(q))
  const radarD = RADAR_AXES.map((a) => a.get(d))
  const findings: ReviewFinding[] = []

  const anxName = q.anx >= d.anx ? names[0] : names[1]
  const avoName = q.avo >= d.avo ? names[0] : names[1]
  const secureName = isSecure(q) ? names[0] : names[1]

  for (const rule of RULES) {
    let triggered = false
    try {
      triggered = rule.when(q, d)
    } catch {
      triggered = false
    }
    if (!triggered) continue
    const fill = (t: string): string => t.replace(/\{anx\}/g, anxName).replace(/\{avo\}/g, avoName).replace(/\{secure\}/g, secureName)
    if (rule.fit) findings.push({ kind: 'fit', text: fill(rule.fit.text), cite: rule.fit.cite })
    if (rule.friction) findings.push({ kind: 'friction', text: fill(rule.friction.text), cite: rule.friction.cite })
  }
  findings.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'fit' ? -1 : 1))
  return { radarQ, radarD, findings }
}
