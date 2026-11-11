
import Decimal from 'decimal.js'

const GameDecimal = Decimal.clone({
  precision: 50
})

// Calculate the current balance without display rounding.
export function calculateCurrentAmountExact(
  savedAmount: string,
  gainRate: string,
  lastUpdate: string | null,
  nowMs: number
): string | null {
  // No saved record yet: use the starting amount.
  if (!lastUpdate) return savedAmount

  const savedTime = Date.parse(lastUpdate)

  if (!Number.isFinite(savedTime)) return null

  const elapsedMs = Math.max(0, nowMs - savedTime)

  const elapsedSeconds = new GameDecimal(elapsedMs).div(1000)

  return new GameDecimal(savedAmount)
    .plus(
      new GameDecimal(gainRate).times(elapsedSeconds)
    )
    .toString()
}

// Format the calculated balance for display.
export function calculateCurrentAmount(
  savedAmount: string,
  gainRate: string,
  lastUpdate: string | null,
  nowMs: number
): string | null {
  const amount = calculateCurrentAmountExact(
    savedAmount,
    gainRate,
    lastUpdate,
    nowMs
  )

  if (amount === null) return null

  const value = new GameDecimal(amount)

  if (value.isZero()) return '0'

  return value.toExponential(2).replace('e', 'E')
}
