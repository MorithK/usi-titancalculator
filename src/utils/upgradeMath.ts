
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
