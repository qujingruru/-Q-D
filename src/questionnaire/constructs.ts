/**
 * Question bank — 12 constructs × 2–4 surface variants each.
 * Constructs are FIXED (the model needs all of them); the drawn surface
 * wording varies per session so repeat plays feel fresh.
 *
 * Voice: everything is THIRD PERSON ("TA") — the user describes the two
 * characters 小Q and 小D; nothing is first/second person.
 */
import type { Constructs } from '../types'

export type ConstructId = keyof Constructs

export interface LikertItem {
  kind: 'likert'
  /** question stem, written in third person about the column's character */
  text: string
  /** true if agreement means LOWER construct score (reverse-scored) */
  reverse?: boolean
}

export interface ChoiceOption {
  label: string
  /** construct score contribution 0..1 */
  score: number
}

export interface ChoiceItem {
  kind: 'choice'
  text: string
  options: ChoiceOption[]
}

export type Item = LikertItem | ChoiceItem

export interface ConstructDef {
  id: ConstructId
  /** short label shown on the review radar chart */
  label: string
  items: Item[]
}

export const CONSTRUCTS: ConstructDef[] = [
  {
    id: 'anx',
    label: '依恋焦虑',
    items: [
      { kind: 'likert', text: '对方几个小时没回消息，TA会忍不住反复查看手机' },
      { kind: 'likert', text: 'TA常常需要对方明确说一句"没事"，才能真正安心' },
      { kind: 'choice', text: '对方最近有点冷淡时，TA的第一反应是……', options: [
        { label: '是不是自己做错了什么', score: 0.85 },
        { label: '对方应该只是太忙了', score: 0.3 },
        { label: '等对方先来找TA', score: 0.5 },
      ] },
    ],
  },
  {
    id: 'avo',
    label: '依恋回避',
    items: [
      { kind: 'likert', text: '关系越亲密，TA有时反而想往后退一点' },
      { kind: 'likert', text: 'TA很难开口说出"我需要你"这句话' },
      { kind: 'choice', text: '心情很差的时候，TA更倾向于……', options: [
        { label: '自己一个人待着', score: 0.85 },
        { label: '找对方说一说', score: 0.2 },
        { label: '多半自己消化', score: 0.6 },
      ] },
    ],
  },
  {
    id: 'neu',
    label: '情绪波动',
    items: [
      { kind: 'likert', text: 'TA的情绪像天气，说变就变' },
      { kind: 'likert', text: '小事也容易让TA烦心很久' },
      { kind: 'likert', text: 'TA大多数时候情绪平稳', reverse: true },
    ],
  },
  {
    id: 'agr',
    label: '温和随和',
    items: [
      { kind: 'likert', text: 'TA很容易体谅别人的难处' },
      { kind: 'likert', text: 'TA是朋友眼里好相处的那类人' },
      { kind: 'choice', text: '观点不一致时，TA更在意……', options: [
        { label: '把话说清楚', score: 0.35 },
        { label: '对方的感受', score: 0.85 },
        { label: '谁更有道理', score: 0.45 },
      ] },
    ],
  },
  {
    id: 'con',
    label: '自律稳重',
    items: [
      { kind: 'likert', text: 'TA做事有计划，很少临时抱佛脚' },
      { kind: 'likert', text: 'TA的生活作息比较规律' },
      { kind: 'likert', text: 'TA经常拖延到最后一刻', reverse: true },
    ],
  },
  {
    id: 'ext',
    label: '外向活力',
    items: [
      { kind: 'likert', text: '聚会里TA通常是活跃气氛的那一个' },
      { kind: 'likert', text: '和很多人待在一起会让TA元气满满' },
      { kind: 'likert', text: 'TA更喜欢安静待着，人多了就累', reverse: true },
    ],
  },
  {
    id: 'stonewall',
    label: '冷战倾向',
    items: [
      { kind: 'choice', text: '两人意见不合时，TA更容易……', options: [
        { label: '冷战，先不说话', score: 0.85 },
        { label: '直说，但容易急', score: 0.25 },
        { label: '先安抚情绪再谈', score: 0.15 },
        { label: '翻旧账', score: 0.45 },
      ] },
      { kind: 'likert', text: '吵到一半，TA会突然不想说话了' },
      { kind: 'choice', text: '争吵之后的第二天，TA通常……', options: [
        { label: '等对方先开口', score: 0.8 },
        { label: '装作无事发生', score: 0.7 },
        { label: '主动找对方和好', score: 0.15 },
      ] },
    ],
  },
  {
    id: 'escalate',
    label: '急躁升温',
    items: [
      { kind: 'likert', text: '争论时，TA的音量会不自觉越来越大' },
      { kind: 'choice', text: '听到一句不舒服的话，TA会……', options: [
        { label: '立刻顶回去', score: 0.9 },
        { label: '忍下来，但记住了', score: 0.5 },
        { label: '先问对方是什么意思', score: 0.2 },
      ] },
      { kind: 'likert', text: '生气的时候，TA说话会很冲' },
    ],
  },
  {
    id: 'repair',
    label: '修复主动',
    items: [
      { kind: 'choice', text: '大吵一架之后，谁先低头？', options: [
        { label: '通常是TA', score: 0.85 },
        { label: '通常是对方', score: 0.4 },
        { label: '看谁吵赢', score: 0.2 },
        { label: '没人，各自冷静很久', score: 0.1 },
      ] },
      { kind: 'likert', text: '气氛僵住的时候，TA会开个玩笑缓和一下' },
      { kind: 'likert', text: 'TA拉不下脸道歉，即使知道是自己的问题', reverse: true },
    ],
  },
  {
    id: 'cap',
    label: '好事回应',
    items: [
      { kind: 'choice', text: '当对方兴冲冲地分享一个好消息时，TA通常……', options: [
        { label: '放下手里的东西，认真听完', score: 0.9 },
        { label: '说声"挺好的"，然后继续忙', score: 0.25 },
        { label: '顺势聊聊自己的事', score: 0.2 },
        { label: '追问细节，比对方还兴奋', score: 0.85 },
      ] },
      { kind: 'likert', text: '对方的高兴，会让TA也跟着高兴起来' },
      { kind: 'likert', text: 'TA常常不太在意对方分享的那些小事', reverse: true },
    ],
  },
  {
    id: 'need',
    label: '亲密需求',
    items: [
      { kind: 'likert', text: 'TA希望每天都有属于两个人的时间' },
      { kind: 'choice', text: 'TA心中理想的相处状态是……', options: [
        { label: '尽量多的时间在一起', score: 0.85 },
        { label: '各忙各的，偶尔相聚', score: 0.3 },
        { label: '各有空间，但有固定的仪式感', score: 0.55 },
      ] },
      { kind: 'likert', text: 'TA很少主动要求陪伴，怕显得黏人', reverse: true },
    ],
  },
  {
    id: 'nov',
    label: '新奇寻求',
    items: [
      { kind: 'likert', text: 'TA喜欢一场说走就走的旅行' },
      { kind: 'choice', text: '周末的夜晚，TA更想……', options: [
        { label: '尝试一家没去过的店', score: 0.85 },
        { label: '宅在家里最舒服', score: 0.25 },
        { label: '都行，主要看对方', score: 0.5 },
      ] },
      { kind: 'likert', text: '一成不变的生活会让TA觉得闷' },
    ],
  },
]

/** Relationship-current-conditions questions (couple-level, single answer). */
export interface RelationshipInitQuestion {
  key: 'togetherMonths' | 'stage' | 'satisfaction'
  text: string
  options: Array<{ label: string; value: number | 'ambiguous' | 'passionate' | 'steady' }>
}

export const RELATIONSHIP_QUESTIONS: RelationshipInitQuestion[] = [
  {
    key: 'togetherMonths',
    text: '小Q和小D在一起多久了？',
    options: [
      { label: '刚开始（3个月内）', value: 2 },
      { label: '半年左右', value: 6 },
      { label: '一年上下', value: 12 },
      { label: '两三年', value: 30 },
      { label: '五年以上', value: 70 },
    ],
  },
  {
    key: 'stage',
    text: '现在的他们，更像哪一种？',
    options: [
      { label: '还在暧昧，心跳很快', value: 'ambiguous' },
      { label: '热恋期，甜到冒泡', value: 'passionate' },
      { label: '平稳期，细水长流', value: 'steady' },
    ],
  },
  {
    key: 'satisfaction',
    text: '此刻，这段关系的整体感觉是……',
    options: [
      { label: '有点迷茫疲惫', value: -1.5 },
      { label: '还行，偶有波澜', value: 0.5 },
      { label: '挺满足的', value: 1.5 },
      { label: '非常幸福', value: 2.5 },
    ],
  },
]
