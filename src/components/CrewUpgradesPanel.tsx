
import { Fragment, useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'
import { type usePlayerResources } from '../hooks/usePlayerResources'
import AffordabilityProgress from './AffordabilityProgress'
import { formatScientific, calculateCurrentAmountExact, getEffectiveGainRate } from '../utils/resourceMath'
import { calculateNextLevelCost, calculateAffordableLevels, AFFORDABLE_LEVEL_LIMIT} from '../utils/upgradeMath'
import { calculateTimeToAfford, formatTimeToAfford, combineAffordability } from '../utils/timeToAfford'
import PurchasePreview from './PurchasePreview'
import { simulatePurchases, type PurchaseItem, type PurchaseSimulation} from '../utils/purchaseMath'
import { type WriteGuard } from '../utils/writeGuard'
import { type ApplyPurchases } from '../utils/purchaseApi'
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

function getRequiredResourceIds(resourceTypeId: number): number[] {
  return resourceTypeId === ALL_SPECIMENS
    ? specimenIds
    : [resourceTypeId]
}

export default function CrewUpgradesPanel({
  userId,
  highestSector,
  resourceState,
  resourceRevision,
  writeGuard,
  onApplyPurchases
}: {
  userId: string
  highestSector: number
  resourceState: ReturnType<typeof usePlayerResources>
  resourceRevision: number
  writeGuard: WriteGuard
  onApplyPurchases: ApplyPurchases
}) {
  const {
    resources,
    nowMs,
    loading: resourcesLoading,
    loadError: resourcesError
  } = resourceState

  const [definitions, setDefinitions] = useState<UpgradeDefinition[]>([])
  const [levels, setLevels] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [savingId, setSavingId] = useState<number | null>(null)
  
  const [selection, setSelection] = useState<{
    revision: number
    overrides: Partial<Record<number, boolean>>
  }>({
    revision: resourceRevision,
    overrides: {}
  })
  
  const [purchasePreview, setPurchasePreview] = useState<PurchaseSimulation | null>(null)
  const [previewRevision, setPreviewRevision] = useState<number | null>(null)
  const orderedDefinitions = upgradeGroups.flatMap(group =>
      definitions.filter(item => item.upgrade_group === group)
    )
    
  const selectedIds = orderedDefinitions
   .filter(definition => {
        const id = definition.crew_upgrade_id
        const level = levels[id] ?? 0
    
        if (
          highestSector < (definition.sector_unlock ?? 0) ||
          !Number.isSafeInteger(level) ||
          level < 0 ||
          level >= 2147483647
        ) {
          return false
        }
    
        const requiredIds = getRequiredResourceIds(
          definition.resource_type_id
        )
    
        const requiredResources = requiredIds.map(resourceId =>
          resources.find(
            item => item.resource_type_id === resourceId
          )
        )
    
        if (requiredResources.some(resource => !resource)) {
          return false
        }
    
        const defaultSelected = requiredResources.every(
          resource => resource?.gain_active === true
        )
    
        const override =
          selection.revision === resourceRevision
            ? selection.overrides[id]
            : undefined
    
        return override ?? defaultSelected
  })
  .map(definition => definition.crew_upgrade_id)
  
  function toggleUpgrade(id: number, checked: boolean) {
    setSelection(previous => ({
      revision: resourceRevision,
      overrides: {
        ...(previous.revision === resourceRevision
          ? previous.overrides
          : {}),
        [id]: checked
      }
    }))

    setPurchasePreview(null)
  }

  async function applyPreview() {
    if (
      purchasePreview === null ||
      purchasePreview.totalLevelsBought === 0 ||
      previewRevision !== resourceRevision ||
      resourcesLoading ||
      resourcesError
    ) {
      return
    }
  
    setMessage('')
  
    try {
      const result = await onApplyPurchases(
        'crew',
        purchasePreview
      )
  
      setLevels(previous => ({
        ...previous,
        ...result.levels
      }))
  
      setPurchasePreview(null)
  
      setMessage(
        `${result.total_levels_bought} levels purchased successfully.`
      )
  
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Purchase failed: ${error.message}`
          : 'Purchase failed.'
      )
    }
  }
  
    
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

    if (!writeGuard.begin()) {
      setMessage('Another save is in progress.')
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
  
  function previewPurchases() {
    setMessage('')
    setPurchasePreview(null)
  
    if (
      selectedIds.length === 0 ||
      resourcesLoading ||
      resourcesError
    ) {
      return
    }
  
    try {
      const snapshotTime = nowMs
  
      const balances: Record<number, string> = {}
  
      for (const resource of resources) {
        const amount = calculateCurrentAmountExact(
          resource.resource_amt,
          getEffectiveGainRate(resource),
          resource.last_update,
          snapshotTime
        )
  
        if (amount === null) {
          throw new Error(
            `Invalid balance: ${resource.resource_name}`
          )
        }
  
        balances[resource.resource_type_id] = amount
      }
  
      const items: PurchaseItem[] = orderedDefinitions
        .filter(definition =>
          selectedIds.includes(definition.crew_upgrade_id)
        )
        .map(definition => ({
          id: String(definition.crew_upgrade_id),
          expectedUpgradeId: definition.crew_upgrade_id,
          name: definition.crew_upgrade_name,
          currentLevel: levels[definition.crew_upgrade_id] ?? 0,
          baseCost: String(definition.base_cost),
          scale: String(definition.scale),
          resourceIds: getRequiredResourceIds(
            definition.resource_type_id
          ),
          requestedLevels: AFFORDABLE_LEVEL_LIMIT
        }))
  
      const result = simulatePurchases(items, balances)
  
      setPurchasePreview(result)
      setPreviewRevision(resourceRevision)
  
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to simulate purchases.'
      )
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
              <th className="pb-3 pr-4 text-center">Buy</th>
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
                    colSpan={7}
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

                    const allSpecimens = definition.resource_type_id === ALL_SPECIMENS

                    const requiredIds = getRequiredResourceIds(
                      definition.resource_type_id
                    )

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

                        return {
                            resourceId,
                            resource,
                            currentAmount,
                            affordableLevels,
                            affordability
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
                        
                     {/* Purchase Selection */}
                        <td className="py-3 pr-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(id)}
                            disabled={
                              locked ||
                              !validLevel ||
                              level >= 2147483647 ||
                              savingId !== null ||
                              resourcesLoading ||
                              !!resourcesError ||
                              requirements.some(item => !item.resource)
                            }
                            onChange={e => toggleUpgrade(
                              id,
                              e.target.checked
                            )}
                            aria-label={`Select ${definition.crew_upgrade_name} for purchase`}
                            className="h-4 w-4 cursor-pointer
                              accent-cyan-500 disabled:opacity-40"
                          />
                        </td>

                    {/* Upgrade Name  */}       
                          <td className="py-3 pr-4 text-white">
                            {definition.crew_upgrade_name}
                          </td>

                    {/* Current Level  */}       
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
                                  setPurchasePreview(null)
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
                    
                    {/* Available Levels */}
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

                    {/* Next Level Cost */}
                          <td className="py-3 text-right font-mono text-cyan-400">
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
        
                    {/* Remaining */}      
                          <td className="py-3 pl-4 text-right">
                            {allSpecimens
                                ? 'See below'
                                : (
                                <AffordabilityProgress
                                    currentAmount={requirements[0].currentAmount}
                                    targetCost={nextCost}
                                    resourceName={requirements[0].resource?.resource_name}
                                    gainActive={requirements[0].resource?.gain_active}
                                />
                                )}
                          </td>

                    {/* Time to Afford */}      
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
                          
                    {/* Save Button */}      
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
                       
                    {/* Corruption Cap specimen list */}      

                        {allSpecimens && !locked &&
                          requirements.map(item => (
                            <tr
                              key={item.resourceId}
                              className="bg-slate-900/40
                                text-xs text-slate-400"
                            >
                              <td></td>
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
                              <td className="py-2 pl-4 text-right">
                                <AffordabilityProgress
                                  currentAmount={item.currentAmount}
                                    targetCost={nextCost}
                                   resourceName={item.resource?.resource_name}
                                   gainActive={item.resource?.gain_active}
                                />
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

      <div className="mt-5 flex items-center gap-4">
        <button
          type="button"
          disabled={
            selectedIds.length === 0 ||
            resourcesLoading ||
            !!resourcesError ||
            savingId !== null
          }
          onClick={previewPurchases}
          className="rounded-md bg-cyan-500 px-4 py-2
            font-medium text-slate-950
            hover:bg-cyan-400 disabled:opacity-50"
        >
          Preview Max Purchases
        </button>

        {purchasePreview !== null &&
          previewRevision === resourceRevision && (
            <PurchasePreview
              preview={purchasePreview}
              resources={resources}
              onClose={() => setPurchasePreview(null)}
              onApply={() => void applyPreview()}
            />
        )}

        <span className="text-sm text-slate-400">
          {selectedIds.length} selected
        </span>
      </div>        

      <p role="status" className="mt-4 text-sm text-slate-400">
        {message}
      </p>
    </section>
  )
}
