
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
      return 'Affordable now'

    case 'unreachable':
      return 'No resource gain'

    case 'waiting': {
      const duration = new GameDecimal(result.seconds)

      // Avoid converting enormous durations to JS numbers.
      if (duration.gte(30 * 86400)) {
        const days = duration
          .div(86400)
          .toSignificantDigits(4, Decimal.ROUND_UP)

        return `${days.toString()} days`
      }

      const total = duration.toNumber()

      const days = Math.floor(total / 86400)
      const hours = Math.floor((total % 86400) / 3600)
      const minutes = Math.floor((total % 3600) / 60)
      const seconds = total % 60

      const parts: string[] = []

      if (days > 0) parts.push(`${days}d`)
      if (hours > 0) parts.push(`${hours}h`)
      if (minutes > 0) parts.push(`${minutes}m`)
      if (seconds > 0) parts.push(`${seconds}s`)

      return parts.join(' ')
    }
  }
}
