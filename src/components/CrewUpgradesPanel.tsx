
import { Fragment, useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'
import { type usePlayerResources } from '../hooks/usePlayerResources'

import {
  formatScientific,
  calculateCurrentAmountExact,
  getEffectiveGainRate,
} from '../utils/resourceMath'

import {
  calculateNextLevelCost,
  calculateAffordableLevels,
  calculateRemainingCost,
  AFFORDABLE_LEVEL_LIMIT,
  calculateAffordabilityProgress
} from '../utils/upgradeMath'

import {
  calculateTimeToAfford,
  formatTimeToAfford,
  combineAffordability
} from '../utils/timeToAfford'

type UpgradeDefinition = {
  crew_upgrade_id: number
  crew_upgrade_name: string
  base_cost: string | number
  scale: string | number
  resource_type_id: number
  upgrade_group: string
  sector_unlock?: number | null
}

const upgradeGroups = ['Crew', 'Compute', 'Reactor']

const ALL_SPECIMENS = 10
const specimenIds = [5, 6, 7, 8, 9]

export default function CrewUpgradesPanel({
  userId,
  highestSector,
  resourceState
}: {
  userId: string
  highestSector: number
  resourceState: ReturnType<typeof usePlayerResources>
}) {
  const {
    resources,
    nowMs,
    loading: resourcesLoading,
    loadError: resourcesError
  } = resourceState

  const [definitions, setDefinitions] =
    useState<UpgradeDefinition[]>([])

  const [levels, setLevels] =
    useState<Record<number, number>>({})

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [savingId, setSavingId] =
    useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    void Promise.all([
      supabase
        .from('crew_upgrade_cost_reference')
        .select('*')
        .order('crew_upgrade_id'),

      supabase
        .from('player_crew_upgrades')
        .select('crew_upgrade_id, current_level')
        .eq('user_id', userId)
    ]).then(([referenceResult, playerResult]) => {
      if (cancelled) return

      if (referenceResult.error || playerResult.error) {
        setError(
          referenceResult.error?.message ??
          playerResult.error?.message ??
          'Unable to load upgrades'
        )
      } else {
        setDefinitions(
          (referenceResult.data ?? []) as UpgradeDefinition[]
        )

        setLevels(
          Object.fromEntries(
            (playerResult.data ?? []).map(row => [
              row.crew_upgrade_id,
              row.current_level
            ])
          )
        )
      }

      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [userId])

  async function saveUpgrade(
    definition: UpgradeDefinition,
    level: number
  ) {
    if (savingId !== null) return

    if (
      !Number.isSafeInteger(level) ||
      level < 0 ||
      level > 2147483647 ||
      highestSector < (definition.sector_unlock ?? 0)
    ) {
      setMessage('Invalid upgrade level.')
      return
    }

    setSavingId(definition.crew_upgrade_id)
    setMessage('')

    try {
      const { error } = await supabase
        .from('player_crew_upgrades')
        .upsert({
          user_id: userId,
          crew_upgrade_id: definition.crew_upgrade_id,
          current_level: level
        }, {
          onConflict: 'user_id,crew_upgrade_id'
        })

      setMessage(
        error
          ? `Save failed: ${error.message}`
          : `${definition.crew_upgrade_name} saved.`
      )
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : 'Save failed.'
      )
    } finally {
      setSavingId(null)
    }
  }

  if (loading) return <p>Loading upgrades...</p>

  if (error) {
    return <p className="text-red-400">{error}</p>
  }

  return (
    <section className="rounded-xl border border-slate-800
      bg-[#111827] p-6">

      <h3 className="mb-2 text-lg font-semibold text-white">
        Crew, Compute & Reactor
      </h3>

      <p className="mb-5 text-sm text-slate-400">
        Configure upgrade levels and calculate affordability.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-212.5 text-left text-sm">
          <thead className="border-b border-slate-700
            text-slate-400">
            <tr>
              <th className="pb-3">Upgrade</th>
              <th className="pb-3">Level</th>
              <th className="pb-3 text-right">Next Cost</th>
              <th className="pb-3 text-right">Remaining</th>
              <th className="pb-3 text-right">Time to Afford</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {upgradeGroups.map(group => (
              <Fragment key={group}>
                <tr className="bg-slate-800/50">
                  <td
                    colSpan={6}
                    className="px-3 py-2 font-semibold
                      text-cyan-400"
                  >
                    {group}
                  </td>
                </tr>

                {definitions
                  .filter(item => item.upgrade_group === group)
                  .map(definition => {
                    const id = definition.crew_upgrade_id
                    const level = levels[id] ?? 0

                    const locked =
                      highestSector <
                      (definition.sector_unlock ?? 0)

                    const validLevel =
                      Number.isSafeInteger(level) &&
                      level >= 0 &&
                      level <= 2147483647

                    const allSpecimens =
                      definition.resource_type_id === ALL_SPECIMENS

                    const requiredIds = allSpecimens
                      ? specimenIds
                      : [definition.resource_type_id]

                    const nextCost = !locked && validLevel
                      ? calculateNextLevelCost(
                          String(definition.base_cost),
                          String(definition.scale),
                          level
                        )
                      : null

                    const requirements = requiredIds.map(resourceId => {
                      const resource = resources.find(
                        item => item.resource_type_id === resourceId
                      )

                      const currentAmount = resource
                        ? calculateCurrentAmountExact(
                            resource.resource_amt,
                            getEffectiveGainRate(resource),
                            resource.last_update,
                            nowMs
                          )
                        : null

                      const remaining =
                        nextCost !== null && currentAmount !== null
                          ? calculateRemainingCost(
                              nextCost,
                              currentAmount
                            )
                          : null

                      const affordableLevels =
                        nextCost !== null && currentAmount !== null
                          ? calculateAffordableLevels(
                              String(definition.base_cost),
                              String(definition.scale),
                              level,
                              currentAmount
                            )
                          : null

                      const affordability =
                        resource && nextCost !== null
                          ? calculateTimeToAfford(
                              currentAmount,
                              getEffectiveGainRate(resource),
                              nextCost
                            )
                          : null
                        const progress = calculateAffordabilityProgress(
                            currentAmount,
                            nextCost
                          )

                      return {
                        resourceId,
                        resource,
                        remaining,
                        affordableLevels,
                        affordability,
                        progress
                      }
                    })

                    const affordableLevels =
                      requirements.every(
                        item => item.affordableLevels !== null
                      )
                        ? Math.min(
                            ...requirements.map(
                              item => item.affordableLevels!
                            )
                          )
                        : null

                    const affordability =
                      requirements.every(
                        item => item.affordability !== null
                      )
                        ? combineAffordability(
                            requirements.map(
                              item => item.affordability!
                            )
                          )
                        : null

                    return (
                      <Fragment key={id}>
                        <tr className="border-b border-slate-800">

                          <td className="py-3 pr-4 text-white">
                            {definition.crew_upgrade_name}
                          </td>

                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={0}
                                step={1}
                                value={level}
                                disabled={savingId !== null || locked}
                                onFocus={e => e.currentTarget.select()}
                                onChange={e => {
                                  setLevels(previous => ({
                                    ...previous,
                                    [id]: Number(e.target.value)
                                  }))
                                  setMessage('')
                                }}
                                className="w-24 rounded-md border
                                  border-slate-700 bg-slate-900
                                  px-3 py-2 text-white"
                              />

                              {affordableLevels !== null && (
                                <span className={`min-w-10
                                  font-mono text-sm ${
                                    affordableLevels > 0
                                      ? 'text-green-400'
                                      : 'text-slate-500'
                                  }`}>
                                  {affordableLevels >= AFFORDABLE_LEVEL_LIMIT
                                    ? `${AFFORDABLE_LEVEL_LIMIT}+`
                                    : `+${affordableLevels}`}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 text-right
                            font-mono text-cyan-400">
                            {locked
                              ? 'Locked'
                              : nextCost !== null
                                ? (
                                  <>
                                    {formatScientific(nextCost)}
                                    <span className="ml-2 text-xs
                                      text-slate-400">
                                      {allSpecimens
                                        ? 'each'
                                        : requirements[0].resource
                                            ?.resource_name}
                                    </span>
                                  </>
                                )
                                : 'Unavailable'}
                          </td>

                          <td className="py-3 pl-4 text-right
                            font-mono text-slate-300">
                            {allSpecimens
                              ? 'See below'
                              : requirements[0].remaining !== null
                                ? formatScientific(
                                    requirements[0].remaining
                                  )
                                : '—'}
                          </td>

                          <td className={`py-3 pl-4 text-right
                            font-mono ${
                              affordability?.status === 'ready'
                                ? 'text-green-400'
                                : 'text-slate-300'
                            }`}>
                            {locked
                              ? 'Locked'
                              : resourcesLoading
                                ? 'Loading...'
                                : resourcesError
                                  ? 'Resource error'
                                  : affordability
                                    ? formatTimeToAfford(affordability)
                                    : 'Unavailable'}
                          </td>

                          <td className="py-3 pl-4 text-right">
                            <button
                              type="button"
                              disabled={
                                savingId !== null ||
                                locked ||
                                !validLevel
                              }
                              onClick={() =>
                                void saveUpgrade(definition, level)
                              }
                              className="rounded-md bg-cyan-500
                                px-4 py-2 font-medium text-slate-950
                                hover:bg-cyan-400 disabled:opacity-50"
                            >
                              {savingId === id ? 'Saving...' : 'Save'}
                            </button>
                          </td>
                        </tr>

                        {allSpecimens && !locked &&
                          requirements.map(item => (
                            <tr
                              key={item.resourceId}
                              className="bg-slate-900/40
                                text-xs text-slate-400"
                            >
                              <td className="py-2 pl-8">
                                {item.resource?.resource_name ??
                                  'Unknown specimen'}
                              </td>

                              <td></td>

                              <td className="py-2 text-right font-mono">
                                {nextCost !== null
                                  ? formatScientific(nextCost)
                                  : '—'}
                              </td>

                            <td className="py-2 pl-4 text-right font-mono">
                            <div className="min-w-32 space-y-1">

                                <div className="flex items-center justify-between gap-3">
                                <span>
                                    {item.remaining !== null
                                    ? formatScientific(item.remaining)
                                    : '—'}
                                </span>

                                {item.progress !== null && (
                                    <span className="text-xs text-slate-400">
                                    {item.progress}%
                                    </span>
                                )}
                                </div>

                                {item.progress !== null && (
                                <div
                                    role="progressbar"
                                    aria-label={`${item.resource?.resource_name} affordability`}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={item.progress}
                                    className="h-1.5 w-full overflow-hidden
                                    rounded-full bg-slate-700"
                                >
                                    <div
                                    className={`h-full rounded-full
                                        transition-all duration-500 ${
                                        item.progress >= 100
                                            ? 'bg-green-400'
                                            : 'bg-cyan-500'
                                        }`}
                                    style={{ width: `${item.progress}%` }}
                                    />
                                </div>
                                )}

                            </div>
                            </td>

                              <td className={`py-2 pl-4
                                text-right font-mono ${
                                  item.affordability?.status === 'ready'
                                    ? 'text-green-400'
                                    : 'text-slate-400'
                                }`}>
                                {item.affordability
                                  ? formatTimeToAfford(item.affordability)
                                  : '—'}
                              </td>

                              <td></td>
                            </tr>
                          ))}
                      </Fragment>
                    )
                  })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <p role="status" className="mt-4 text-sm text-slate-400">
        {message}
      </p>
    </section>
  )
}
