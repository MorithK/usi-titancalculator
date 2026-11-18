
import Decimal from 'decimal.js'

const GameDecimal = Decimal.clone({
  precision: 50
})

export type Affordability =
  | { status: 'no-target' }
  | { status: 'invalid' }
  | { status: 'ready' }
  | { status: 'unreachable' }
  | { status: 'waiting'; seconds: string }

export function calculateTimeToAfford(
  currentAmount: string | null,
  gainRate: string,
  targetCost: string
): Affordability {
  if (!targetCost.trim()) {
    return { status: 'no-target' }
  }

  if (currentAmount === null) {
    return { status: 'invalid' }
  }

  try {
    const current = new GameDecimal(currentAmount)
    const rate = new GameDecimal(gainRate)
    const cost = new GameDecimal(targetCost)

    if (
      !current.isFinite() ||
      !rate.isFinite() ||
      !cost.isFinite() ||
      cost.isNegative()
    ) {
      return { status: 'invalid' }
    }

    // Already have enough resources.
    if (current.gte(cost)) {
      return { status: 'ready' }
    }

    // Cannot afford it without positive income.
    if (rate.lte(0)) {
      return { status: 'unreachable' }
    }

    const remaining = cost.minus(current)

    // Round up so we don't claim affordability too early.
    const seconds = remaining.div(rate).ceil()

    return {
      status: 'waiting',
      seconds: seconds.toString()
    }

  } catch {
    return { status: 'invalid' }
  }
}


export function formatTimeToAfford(
  result: Affordability
): string {
  switch (result.status) {
    case 'no-target':
      return '—'

    case 'invalid':
      return 'Invalid value'

    case 'ready':
      return 'Level Available'

    case 'unreachable':
      return 'No resource gain'

    case 'waiting': {
      const duration = new GameDecimal(result.seconds)
      const days = duration.div(86400)

      function formatClock(seconds: number): string {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = Math.floor(seconds % 60)

        return [h, m, s]
          .map(value => String(value).padStart(2, '0'))
          .join(':')
      }

      if (days.lte(0)) {
        return 'Level Available'
      }

      // Up to 2 days
      if (days.lte(2)) {
        return formatClock(duration.toNumber())
      }

      // Less than 31 days
      if (days.lt(31)) {
        const d = days.floor().toNumber()
        const remainder = duration.mod(86400).toNumber()

        return `${d}${d === 1 ? ' Day' : ' Days'}, ${
          formatClock(remainder)
        }`
      }

      // Less than one year
      if (days.lt(365.25)) {
        const m = days.div(30.4375).floor().toNumber()
        const d = days.mod(30.4375).floor().toNumber()

        return `${m}${m === 1 ? ' Month' : ' Months'}${
          d > 0
            ? `, ${d}${d === 1 ? ' Day' : ' Days'}`
            : ''
        }`
      }

      // One year or more
      const y = days.div(365.25).floor()

      return y.gt(999)
        ? '999+ years'
        : `${y.toFixed(0)}+ years`
    }
  }
}


export function combineAffordability(
  results: Affordability[]
): Affordability {
  if (
    results.length === 0 ||
    results.some(result =>
      result.status === 'invalid' ||
      result.status === 'no-target'
    )
  ) {
    return { status: 'invalid' }
  }

  if (results.some(result => result.status === 'unreachable')) {
    return { status: 'unreachable' }
  }

  let longestWait = new GameDecimal(0)

  for (const result of results) {
    if (result.status === 'waiting') {
      longestWait = GameDecimal.max(
        longestWait,
        result.seconds
      )
    }
  }

  return longestWait.isZero()
    ? { status: 'ready' }
    : {
        status: 'waiting',
        seconds: longestWait.toString()
      }
}
