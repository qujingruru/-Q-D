import { useEffect, useMemo, useState } from 'react'
import { Creature } from '../art/Characters'
import { QUESTIONNAIRE_HINT, QUESTIONNAIRE_LEAD, REL_LEAD } from '../copy'
import { RELATIONSHIP_QUESTIONS } from '../questionnaire/constructs'
import { scoreAnswers } from '../questionnaire/draw'
import { constructsToParams } from '../model/params'
import { useApp } from '../store'
import { buildInviteUrl } from '../invite/codec'
import { bumpCounter } from '../social/counter'
import type { RelAnswers } from '../store'

/** Likert anchors in third person (describing the column's character). */
const LIKERT = ['完全不像', '不太像', '一般', '比较像', '非常像']

export function QuestionnaireScreen() {
  const { drawn, answersQ, answersD, lockedSide, answer, completeQuestionnaire, setRel, sessionSeed } = useApp()
  const [step, setStep] = useState(0) // 0..11 items, 12..14 rel, 15 done
  const [relLocal, setRelLocal] = useState<Partial<RelAnswers>>({})
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)

  const totalSteps = drawn.length + RELATIONSHIP_QUESTIONS.length
  const isRelStep = step >= drawn.length
  const itemIdx = step
  const goNext = () => setStep(Math.min(step + 1, totalSteps))

  const qDone = useMemo(() => answersQ.every((a) => a !== null), [answersQ])

  const finish = () => {
    setRel(relLocal as RelAnswers)
    // skipped items fall back to a neutral default: likert → middle anchor,
    // choice → the option whose score is closest to 0.5
    const defaultFor = (it: (typeof drawn)[number]['item']): number =>
      it.kind === 'likert'
        ? 3
        : it.options.reduce((best, o, i) => (Math.abs(o.score - 0.5) < Math.abs(it.options[best].score - 0.5) ? i : best), 0)
    const [cq, cd] = scoreAnswers(
      drawn,
      answersQ.map((a, i) => a ?? defaultFor(drawn[i].item)),
      answersD.map((a, i) => a ?? defaultFor(drawn[i].item)),
    )
    bumpCounter()
    completeQuestionnaire([constructsToParams(cq), constructsToParams(cd)])
  }

  const makeInvite = () => {
    const url = buildInviteUrl({
      s: sessionSeed,
      q: answersQ.map((a) => a ?? 0),
      r: [relLocal.togetherMonths ?? 12, relLocal.stage ?? 'steady', relLocal.satisfaction ?? 1.0],
    })
    setInviteUrl(url)
    void navigator.clipboard?.writeText(url).catch(() => undefined)
  }

  // ---- final step: confirm ------------------------------------------------
  if (step >= totalSteps) {
    return (
      <div className="screen">
        <div className="qa-final">
          <div className="qa-final-duo">
            <Creature who={0} mood="love" size={92} />
            <Creature who={1} mood="love" size={92} />
          </div>
          <p>初始设定完成。</p>
          <p className="muted">十个维度已经就位，一万个宇宙正在等待展开。</p>
          <button className="cta-btn" onClick={finish}>
            展开一万次平行世界
          </button>
          <button className="back-btn" onClick={() => setStep(totalSteps - 1)}>
            ← 回去修改
          </button>
          {lockedSide === null && qDone && (
            <div className="invite-box">
              <button className="chip" onClick={makeInvite}>
                邀请TA来填TA的那一半 🔗
              </button>
              {inviteUrl && <p className="muted small">链接已复制——发给TA，TA打开后你们将得到共同的一万个世界</p>}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ---- relationship questions --------------------------------------------
  if (isRelStep) {
    const rq = RELATIONSHIP_QUESTIONS[step - drawn.length]
    return (
      <div className="screen">
        <Progress step={step} total={totalSteps} />
        <p className="qa-lead">{REL_LEAD}</p>
        <div className="qa-card rel-card">
          <h3 className="qa-question">{rq.text}</h3>
          <div className="rel-options">
            {rq.options.map((o) => (
              <button
                key={String(o.value)}
                className={`option-btn${relLocal[rq.key] === o.value ? ' sel' : ''}`}
                onClick={() => {
                  setRelLocal({ ...relLocal, [rq.key]: o.value } as Partial<RelAnswers>)
                  setTimeout(goNext, 380)
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div className="qa-nav">
          <BackButton step={step} setStep={setStep} />
          <button className="next-btn" onClick={goNext}>
            {step + 1 >= totalSteps ? '完成 →' : '下一题 →'}
          </button>
        </div>
      </div>
    )
  }

  // ---- dual-answer construct item ------------------------------------------
  const drawnItem = drawn[itemIdx]
  const item = drawnItem.item

  return (
    <div className="screen">
      <Progress step={step} total={totalSteps} />
      <p className="qa-lead">{QUESTIONNAIRE_LEAD}</p>
      <h3 className="qa-question">{item.text}</h3>
      <div className="qa-duo">
        <AnswerColumn
          who={0}
          name="小Q"
          item={item}
          value={answersQ[itemIdx]}
          locked={lockedSide === 'q'}
          onSelect={(v) => {
            answer('q', itemIdx, v)
            if (answersD[itemIdx] !== null) setTimeout(goNext, 480)
          }}
        />
        <AnswerColumn
          who={1}
          name="小D"
          item={item}
          value={answersD[itemIdx]}
          locked={lockedSide === 'd'}
          onSelect={(v) => {
            answer('d', itemIdx, v)
            if (answersQ[itemIdx] !== null) setTimeout(goNext, 480)
          }}
        />
      </div>
      <p className="muted small qa-hint">{QUESTIONNAIRE_HINT}</p>
      <div className="qa-nav">
        <BackButton step={step} setStep={setStep} />
        <button className="next-btn" onClick={goNext}>
          {step + 1 >= totalSteps ? '完成 →' : '下一题 →'}
        </button>
      </div>
    </div>
  )
}

function LikertSlider(props: { value: number | null; locked: boolean; onCommit: (v: number) => void }) {
  const { value, locked, onCommit } = props
  const [pos, setPos] = useState(value ?? 3)
  useEffect(() => {
    if (value !== null) setPos(value)
  }, [value])
  return (
    <div className={`likert-slider${locked ? ' locked' : ''}`}>
      <span className={`slider-current${value === null ? ' empty' : ''}`}>
        {value === null ? '← 拖动滑块打分' : LIKERT[pos - 1]}
      </span>
      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={pos}
        disabled={locked}
        aria-label="符合程度"
        onChange={(e) => setPos(Number(e.target.value))}
        onPointerUp={() => !locked && onCommit(pos)}
        onTouchEnd={() => !locked && onCommit(pos)}
        onKeyUp={() => !locked && onCommit(pos)}
      />
      <div className="slider-scale">
        {LIKERT.map((l, i) => (
          <span key={l} className={value !== null && pos === i + 1 ? 'on' : ''}>
            {l}
          </span>
        ))}
      </div>
    </div>
  )
}

function AnswerColumn(props: {
  who: 0 | 1
  name: string
  item: { kind: 'likert'; reverse?: boolean } | { kind: 'choice'; options: Array<{ label: string; score: number }> }
  value: number | null
  locked: boolean
  onSelect: (v: number) => void
}) {
  const { who, name, item, value, locked, onSelect } = props
  const mood = value !== null ? 'happy' : 'calm'
  return (
    <div className={`qa-col qa-col-${who}${locked ? ' qa-col-locked' : ''}`}>
      <div className="qa-col-head">
        <Creature who={who} mood={mood as 'happy' | 'calm'} size={64} />
        <span>{name}</span>
        {locked && <em>已设定</em>}
      </div>
      {item.kind === 'likert' ? (
        <LikertSlider value={value} locked={locked} onCommit={onSelect} />
      ) : (
        <div className="choice">
          {item.options.map((o, i) => (
            <button
              key={o.label}
              className={`choice-btn${value === i ? ' sel' : ''}`}
              disabled={locked}
              onClick={() => onSelect(i)}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Progress({ step, total }: { step: number; total: number }) {
  return (
    <div className="qa-progress">
      <span>
        第 {Math.min(step + 1, total)} / {total} 题
      </span>
      <div className="pv-bar">
        <span style={{ width: `${((step + 1) / total) * 100}%` }} />
      </div>
    </div>
  )
}

function BackButton({ step, setStep }: { step: number; setStep: (n: number) => void }) {
  if (step === 0) return null
  return (
    <button className="back-btn" onClick={() => setStep(step - 1)}>
      ← 上一题
    </button>
  )
}
