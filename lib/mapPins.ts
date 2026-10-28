// Prisnålarna ritas på canvas och läggs in som bilder i kartan.
// Då får de appens eget typsnitt och färger, och kartan behöver inga glyfer för dem.

import { colors } from './theme'
import type { PinStyle, PriceTier } from './mapBars'

export const TIER_COLORS: Record<PriceTier, string> = {
  cheap: colors.success,
  mid: colors.warning,
  pricey: colors.danger,
  none: colors.surface,
}

// Blixt (lucide Zap) för happy hour, i en 24 × 24-ruta
const ZAP_PATH =
  'M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z'

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const r = h / 2
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export type PinImage = { width: number; height: number; data: Uint8ClampedArray }

/**
 * Ritar en nål som "39 kr" i prisets färg. Happy hour får blixt och rosa ring,
 * vald bar blir större med vit ring. Mått i CSS-pixlar × pixelRatio.
 */
export function drawPin(style: PinStyle, fontFamily: string, pixelRatio: number): PinImage | null {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const fontSize = style.selected ? 15 : 13
  const height = style.selected ? 32 : 26
  const padX = style.selected ? 11 : 9
  const icon = style.happyHour ? fontSize : 0
  const gap = style.happyHour ? 3 : 0
  const ring = style.happyHour || style.selected ? 3 : 0 // yttre ring
  const shadow = 4

  const font = `700 ${fontSize}px ${fontFamily || 'monospace'}`
  ctx.font = font
  const textWidth = Math.ceil(ctx.measureText(style.label).width)
  const pillW = Math.max(height, padX * 2 + icon + gap + textWidth)
  const width = pillW + (ring + shadow) * 2
  const fullH = height + (ring + shadow) * 2

  canvas.width = Math.ceil(width * pixelRatio)
  canvas.height = Math.ceil(fullH * pixelRatio)
  ctx.scale(pixelRatio, pixelRatio)

  const x = ring + shadow
  const y = ring + shadow
  const fill = TIER_COLORS[style.tier]
  const textColor = style.tier === 'none' ? colors.cream : colors.ink

  // Skugga under nålen så att den lyfter från kartan
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)'
  ctx.shadowBlur = shadow
  ctx.shadowOffsetY = 1
  roundedRect(ctx, x - ring, y - ring, pillW + ring * 2, height + ring * 2)
  ctx.fillStyle = style.selected ? colors.white : style.happyHour ? colors.brand.DEFAULT : colors.ink
  ctx.fill()
  ctx.restore()

  // Mörk kant mellan ring och fyllnad, sedan själva nålen
  roundedRect(ctx, x, y, pillW, height)
  ctx.fillStyle = colors.ink
  ctx.fill()
  roundedRect(ctx, x + 1.5, y + 1.5, pillW - 3, height - 3)
  ctx.fillStyle = fill
  ctx.fill()

  // Innehållet centreras i nålen
  const contentW = icon + gap + textWidth
  let cx = x + (pillW - contentW) / 2
  if (style.happyHour) {
    ctx.save()
    ctx.translate(cx, y + (height - icon) / 2)
    ctx.scale(icon / 24, icon / 24)
    ctx.fillStyle = textColor
    ctx.fill(new Path2D(ZAP_PATH))
    ctx.restore()
    cx += icon + gap
  }
  ctx.font = font
  ctx.fillStyle = textColor
  ctx.textBaseline = 'middle'
  ctx.fillText(style.label, cx, y + height / 2 + 1)

  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  return { width: canvas.width, height: canvas.height, data }
}
