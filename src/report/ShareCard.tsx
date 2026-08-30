/**
 * Share card — native canvas renderer (deterministic, no html2canvas).
 * Produces a warm-toned PNG with the two headline numbers, the couple, the
 * world number and a QR-less minimal footer (QR lands with a public URL).
 */
import type { McResult } from './stats'

export interface ShareCardInput {
  names: [string, string]
  baseline: McResult
  scenario: McResult | null
  scenarioLabel: string | null
  worldNo: number
}

const W = 900
const H = 1200

const PAPER = '#faf6ef'
const INK = '#4a4238'
const SOFT = '#8a7f70'
const Q = '#e8836f'
const D = '#7d9bb3'
const GOLD = '#d9a441'
const LINE = '#e8dfd0'

export async function renderShareCard(input: ShareCardInput): Promise<Blob> {
  const canvas = document.createElement('canvas')
  const dpr = 2
  canvas.width = W * dpr
  canvas.height = H * dpr
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unavailable')
  ctx.scale(dpr, dpr)

  // background + frame
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = LINE
  ctx.lineWidth = 2
  roundRect(ctx, 28, 28, W - 56, H - 56, 24)
  ctx.stroke()

  ctx.textAlign = 'center'

  // title
  ctx.fillStyle = INK
  ctx.font = '600 44px "Songti SC", "Noto Serif SC", serif'
  ctx.fillText(`${input.names[0]}和${input.names[1]}的一万次恋爱结局`, W / 2, 128)

  ctx.fillStyle = SOFT
  ctx.font = '24px "Songti SC", "Noto Serif SC", serif'
  ctx.fillText('在一万个平行世界里', W / 2, 186)

  // couple blobs
  drawCreature(ctx, W / 2 - 120, 300, Q, 84, true)
  drawCreature(ctx, W / 2 + 120, 300, D, 84, false)
  // connecting thread
  ctx.strokeStyle = GOLD
  ctx.lineWidth = 2.5
  ctx.setLineDash([1, 7])
  ctx.beginPath()
  ctx.moveTo(W / 2 - 70, 330)
  ctx.bezierCurveTo(W / 2 - 20, 306, W / 2 + 20, 306, W / 2 + 70, 330)
  ctx.stroke()
  ctx.setLineDash([])

  // baseline headline
  ctx.fillStyle = INK
  ctx.font = '26px "Songti SC", "Noto Serif SC", serif'
  ctx.fillText('在没有客观阻力的情况下', W / 2, 470)
  ctx.font = '600 34px "Songti SC", "Noto Serif SC", serif'
  const p1 = (input.baseline.p50y * 100).toFixed(1)
  ctx.fillText('他们在', W / 2 - 150, 540)
  ctx.fillStyle = Q
  ctx.font = '700 92px "Songti SC", "Noto Serif SC", serif'
  ctx.fillText(`${p1}%`, W / 2 + 40, 552)
  ctx.fillStyle = INK
  ctx.font = '600 34px "Songti SC", "Noto Serif SC", serif'
  ctx.fillText('的世界里', W / 2 + 195, 540)
  ctx.font = '24px "Songti SC", "Noto Serif SC", serif'
  ctx.fillStyle = SOFT
  ctx.fillText('相爱超过 50 年（我们以50年，为相爱久久）', W / 2, 610)

  // scenario headline
  let y = 720
  if (input.scenario && input.scenarioLabel) {
    ctx.fillStyle = INK
    ctx.font = '26px "Songti SC", "Noto Serif SC", serif'
    ctx.fillText(`压力之下（${input.scenarioLabel}）`, W / 2, y)
    y += 84
    const p2 = (input.scenario.p50y * 100).toFixed(1)
    ctx.fillStyle = D
    ctx.font = '700 76px "Songti SC", "Noto Serif SC", serif'
    ctx.fillText(`${p2}%`, W / 2, y)
    ctx.fillStyle = SOFT
    ctx.font = '24px "Songti SC", "Noto Serif SC", serif'
    y += 48
    ctx.fillText('的世界里，他们仍然白头偕老', W / 2, y)
    y += 70
  }

  // divider + world number
  ctx.strokeStyle = LINE
  ctx.beginPath()
  ctx.moveTo(140, y)
  ctx.lineTo(W - 140, y)
  ctx.stroke()
  ctx.fillStyle = GOLD
  ctx.font = '24px "Songti SC", "Noto Serif SC", serif'
  ctx.fillText(`宇宙编号 #${input.worldNo} · 平行世界 #${input.worldNo + 1}`, W / 2, y + 46)

  // footer
  ctx.fillStyle = SOFT
  ctx.font = '20px "Songti SC", "Noto Serif SC", serif'
  ctx.fillText('仅供娱乐 · 基于心理学文献的方向性简化模型', W / 2, H - 96)
  ctx.fillText('数据与计算均在本机完成', W / 2, H - 64)

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
  })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function drawCreature(ctx: CanvasRenderingContext2D, cx: number, cy: number, fill: string, r: number, isQ: boolean): void {
  const rx = isQ ? r * 0.95 : r * 0.82
  const ry = isQ ? r * 0.92 : r * 1.08
  ctx.fillStyle = 'rgba(74,66,56,0.10)'
  ctx.beginPath()
  ctx.ellipse(cx, cy + ry + 6, rx, 6, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
  // happy face
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(cx - rx * 0.32, cy - ry * 0.18, 5, Math.PI, 0)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cx + rx * 0.32, cy - ry * 0.18, 5, Math.PI, 0)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cx, cy + ry * 0.1, 12, 0.15 * Math.PI, 0.85 * Math.PI)
  ctx.stroke()
}

/** trigger a PNG download */
export function downloadShareCard(input: ShareCardInput): void {
  void renderShareCard(input).then((blob) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `小Q和小D的一万次恋爱结局-${input.worldNo}.png`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
  })
}
