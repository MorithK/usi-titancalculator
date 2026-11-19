
import Decimal from 'decimal.js'

import {
  calculateNextLevelCost,
  AFFORDABLE_LEVEL_LIMIT
} from './upgradeMath'

const GameDecimal = Decimal.clone({
  precision: 50
})

export type PurchaseItem = {
  id: string
  name: string
  currentLevel: number
  baseCost: string
  scale: string
  resourceIds: number[]
  requestedLevels: number
}

export type PurchaseResult = PurchaseItem & {
  finalLevel: number
  levelsBought: number
}

export type PurchaseSimulation = {
  items: PurchaseResult[]
  remainingBalances: Record<number, string>
  spent: Record<number, string>
  totalLevelsBought: number
}

export function simulatePurchases(
  items: PurchaseItem[],
  resourceBalances: Record<number, string>
): PurchaseSimulation {

  const balances = new Map<number, Decimal>()
  const spent = new Map<number, Decimal>()

  for (const [id, amount] of Object.entries(resourceBalances)) {
    const balance = new GameDecimal(amount)

    if (!balance.isFinite() || balance.isNegative()) {
      throw new Error(`Invalid resource balance: ${id}`)
    }

    balances.set(Number(id), balance)
    spent.set(Number(id), new GameDecimal(0))
  }

  const activeItems = items.map(item => {
    if (
      !Number.isSafeInteger(item.currentLevel) ||
      item.currentLevel < 0 ||
      item.currentLevel > 2147483647 ||
      !Number.isSafeInteger(item.requestedLevels) ||
      item.requestedLevels < 0 ||
      item.requestedLevels > AFFORDABLE_LEVEL_LIMIT ||
      item.resourceIds.length === 0 ||
      new Set(item.resourceIds).size !== item.resourceIds.length
    ) {
      throw new Error(`Invalid purchase request: ${item.name}`)
    }

    for (const id of item.resourceIds) {
      if (!balances.has(id)) {
        throw new Error(`Missing resource balance: ${id}`)
      }
    }

    return {
      ...item,
      finalLevel: item.currentLevel,
      levelsBought: 0,
      nextCost: new GameDecimal(
        calculateNextLevelCost(
          item.baseCost,
          item.scale,
          item.currentLevel
        )
      )
    }
  })

  let totalLevelsBought = 0

  while (true) {
    let cheapest: typeof activeItems[number] | null = null

    for (const item of activeItems) {
      if (
        item.levelsBought >= item.requestedLevels ||
        item.finalLevel >= 2147483647
      ) {
        continue
      }

      if (
        !item.nextCost.isFinite() ||
        item.nextCost.lte(0)
      ) {
        throw new Error(`Invalid purchase cost: ${item.name}`)
      }

      const canAfford = item.resourceIds.every(id =>
        balances.get(id)!.gte(item.nextCost)
      )

      if (!canAfford) continue

      if (
        cheapest === null ||
        item.nextCost.lt(cheapest.nextCost)
      ) {
        cheapest = item
      }
    }

    if (cheapest === null) break

    // Deduct the cost from every required resource.
    for (const id of cheapest.resourceIds) {
      balances.set(
        id,
        balances.get(id)!.minus(cheapest.nextCost)
      )

      spent.set(
        id,
        spent.get(id)!.plus(cheapest.nextCost)
      )
    }

    cheapest.finalLevel++
    cheapest.levelsBought++
    totalLevelsBought++

    // Calculate the price of the following level.
    cheapest.nextCost = new GameDecimal(
      calculateNextLevelCost(
        cheapest.baseCost,
        cheapest.scale,
        cheapest.finalLevel
      )
    )
  }

  return {
    items: activeItems.map(({ nextCost, ...item }) => item),

    remainingBalances: Object.fromEntries(
      Array.from(balances, ([id, amount]) => [
        id,
        amount.toString()
      ])
    ),

    spent: Object.fromEntries(
      Array.from(spent, ([id, amount]) => [
        id,
        amount.toString()
      ])
    ),

    totalLevelsBought
  }
}
