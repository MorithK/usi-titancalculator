
import {
  calculateAffordabilityProgress,
  calculateRemainingCost
} from '../utils/upgradeMath'

import { formatScientific } from '../utils/resourceMath'

type AffordabilityProgressProps = {
    currentAmount: string | null
    targetCost: string | null
    resourceName?: string
    gainActive?: boolean
  }

  export default function AffordabilityProgress({
    currentAmount,
    targetCost,
    resourceName,
    gainActive = true
  }: AffordabilityProgressProps) {

  const progress = calculateAffordabilityProgress(
    currentAmount,
    targetCost
  )

  const remaining =
    currentAmount !== null && targetCost !== null
      ? calculateRemainingCost(targetCost, currentAmount)
      : null

  if (progress === null || remaining === null) {
    return <span>—</span>
  }

  return (
        <div
            className={`min-w-32 space-y-1 font-mono
                transition-opacity duration-300 ${
                gainActive ? 'opacity-100' : 'opacity-40'
                }`}
            title={gainActive
                ? undefined
                : 'Resource gain paused in current region'}
        >
      <div className="flex items-center justify-between gap-3">
        <span className={
          progress >= 100
            ? 'text-green-400'
            : 'text-slate-300'
        }>
          {formatScientific(remaining)}
        </span>

        <span className="text-xs text-slate-400">
          {progress}%
        </span>
      </div>

      <div
        role="progressbar"
        aria-label={`${resourceName ?? 'Resource'} affordability`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        className="h-1.5 w-full overflow-hidden
          rounded-full bg-slate-700"
      >
        <div
          className={`h-full rounded-full
            transition-all duration-500 ${
              progress >= 100
                ? 'bg-green-400'
                : 'bg-cyan-500'
            }`}
          style={{ width: `${progress}%` }}
        />
      </div>

    </div>
  )
}
