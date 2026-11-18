
import Decimal from 'decimal.js'

const GameDecimal = Decimal.clone({
  precision: 50
})

export function calculateNextLevelCost(
  baseCost: string,
  scale: string,
  currentLevel: number
): string {
  if (!Number.isSafeInteger(currentLevel) || currentLevel < 0) {
    throw new Error('Invalid upgrade level')
  }
  
  return new GameDecimal(baseCost)
    .times(new GameDecimal(scale).pow(currentLevel))
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toString()
}
export const AFFORDABLE_LEVEL_LIMIT = 1000
  
export function calculateAffordableLevels(
  baseCost: string,
  scale: string,
  currentLevel: number,
  currentAmount: string
): number {
  let remaining = new GameDecimal(currentAmount)
  let levels = 0

  while (levels < AFFORDABLE_LEVEL_LIMIT) {
    const cost = new GameDecimal(
      calculateNextLevelCost(
        baseCost,
        scale,
        currentLevel + levels
      )
    )

    if (remaining.lt(cost)) break

    remaining = remaining.minus(cost)
    levels++
  }

  return levels
}

export function calculateNextMilestone(
  currentLevel: number,
  milestoneLevels: number[]
): number | null {
  return milestoneLevels.find(
    level => level > currentLevel
  ) ?? null
}

export function calculateCostToLevel(
  baseCost: string,
  scale: string,
  currentLevel: number,
  targetLevel: number
): string {
  let totalCost = new GameDecimal(0)

  for (let level = currentLevel; level < targetLevel; level++) {
    totalCost = totalCost.plus(
      calculateNextLevelCost(
        baseCost,
        scale,
        level
      )
    )
  }

  return totalCost.toString()
}

export function calculateRemainingCost(
  totalCost: string,
  currentAmount: string
): string {
  return new GameDecimal(totalCost)
    .minus(currentAmount)
    .toString()
}

export function calculateAffordabilityProgress(
  currentAmount: string | null,
  targetCost: string | null
): number | null {
  if (currentAmount === null || targetCost === null) {
    return null
  }

  const current = new GameDecimal(currentAmount)
  const cost = new GameDecimal(targetCost)

  if (
    !current.isFinite() ||
    !cost.isFinite() ||
    cost.isNegative()
  ) {
    return null
  }

  if (current.gte(cost)) return 100
  if (current.lte(0)) return 0

  return current
    .div(cost)
    .times(100)
    .toDecimalPlaces(1, Decimal.ROUND_DOWN)
    .toNumber()
}

