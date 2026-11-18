
import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'
import { formatScientific, calculateCurrentAmountExact, getEffectiveGainRate } from '../utils/resourceMath'
import { calculateNextLevelCost, calculateAffordableLevels, AFFORDABLE_LEVEL_LIMIT,  calculateNextMilestone,  calculateCostToLevel } from '../utils/upgradeMath'
import { type usePlayerResources } from '../hooks/usePlayerResources'
import { calculateTimeToAfford, formatTimeToAfford } from '../utils/timeToAfford'
import AffordabilityProgress from './AffordabilityProgress'

type UpgradeDefinition = {
  core_upgrade_id: number
  core_upgrade_name: string
  base_cost: string | number
  scale: string | number
  resource_type_id: number
  sector_unlock: number
  component_type: string
  milestone_levels: number[]
}

type ComponentSlot = {
  slot_number: number
  core_upgrade_id: number
  current_level: number
}

const resourceImages: Record<string, string> = {
  Capital: 'Frag_Capital.svg',
  Veil: 'Frag_Veil.svg',
  Antum: 'Frag_Antum.svg',
  Penum: 'Frag_Penum.svg',
  Zephyrion: 'Alien_Zephyrion.svg',
  Yttaldar: 'Alien_Yttaldar.svg',
  Xyloquant: 'Alien_Xyloquant.svg',
  Wraithtex: 'Alien_Wraithtex.svg',
  Verdanix: 'Alien_Verdanix.svg'
}

const slotDefinitions = [
  { slot: 1, label: 'Weapon 1', defaultId: 2, type: 'Weapon' },
  { slot: 2, label: 'Weapon 2', defaultId: 2, type: 'Weapon' },
  { slot: 3, label: 'Weapon 3', defaultId: 2, type: 'Weapon' },
  { slot: 4, label: 'Titan Array', defaultId: 4, type: 'Array' },
  { slot: 5, label: 'Titan Shield', defaultId: 5, type: 'Shield' },
  { slot: 6, label: 'Utility 1', defaultId: 6, type: 'Utility' },
  { slot: 7, label: 'Utility 2', defaultId: 7, type: 'Utility' }
]

const resourceNames: Record<number, string> = {
  2: 'Veil',
  3: 'Antum',
  4: 'Penum'
}

export default function TitanComponentsPanel({
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

  const [slots, setSlots] =
    useState<ComponentSlot[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [savingSlot, setSavingSlot] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    void Promise.all([
      supabase
        .from('core_upgrade_cost_reference')
        .select('*')
        .order('core_upgrade_id'),

      supabase
        .from('player_titan_components')
        .select('slot_number, core_upgrade_id, current_level')
        .eq('user_id', userId)
    ]).then(([referenceResult, playerResult]) => {
      if (cancelled) return

      if (referenceResult.error || playerResult.error) {
        setError(
          referenceResult.error?.message ??
          playerResult.error?.message ??
          'Unable to load components'
        )
      } else {
        setDefinitions(
          (referenceResult.data ?? []) as UpgradeDefinition[]
        )

        const savedSlots = new Map(
          (playerResult.data ?? []).map(row => [
            row.slot_number,
            row
          ])
        )

        setSlots(
          slotDefinitions.map(config => {
            const saved = savedSlots.get(config.slot)

            return {
              slot_number: config.slot,
              core_upgrade_id:
                saved?.core_upgrade_id ?? config.defaultId,
              current_level: saved?.current_level ?? 0
            }
          })
        )
      }

      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [userId])

  function updateSlot(
    slotNumber: number,
    changes: Partial<ComponentSlot>
  ) {
    setSlots(current =>
      current.map(slot =>
        slot.slot_number === slotNumber
          ? { ...slot, ...changes }
          : slot
      )
    )
    setMessage('')
  }

  async function saveSlot(slot: ComponentSlot) {
    if (savingSlot !== null) return

    const definition = definitions.find(
      item => item.core_upgrade_id === slot.core_upgrade_id
    )

    const config = slotDefinitions.find(
      item => item.slot === slot.slot_number
    )

    if (
      !definition ||
      !config ||
      !Number.isSafeInteger(slot.current_level) ||
      slot.current_level < 0 ||
      highestSector < definition.sector_unlock ||
      (config.slot > 3 &&
        definition.component_type !== config.type)
    ) {
      setMessage('Invalid component configuration or level.')
      return
    }

    if (
      config.type === 'Utility' &&
      slots.some(other =>
        other.slot_number !== slot.slot_number &&
        other.slot_number >= 6 &&
        other.core_upgrade_id === slot.core_upgrade_id
      )
    ) {
      setMessage('Utilities must be unique.')
      return
    }

    setSavingSlot(slot.slot_number)
    setMessage('')

    try {
      const { error } = await supabase
        .from('player_titan_components')
        .upsert({
          user_id: userId,
          slot_number: slot.slot_number,
          core_upgrade_id: slot.core_upgrade_id,
          current_level: slot.current_level
        }, {
          onConflict: 'user_id,slot_number'
        })

      setMessage(
        error
          ? `Save failed: ${error.message}`
          : `${config.label} saved.`
      )
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : 'Save failed.'
      )
    } finally {
      setSavingSlot(null)
    }
  }

  if (loading) return <p>Loading Titan components...</p>

  if (error) {
    return <p role="alert" className="text-red-400">{error}</p>
  }


  return (
    <section className="rounded-xl border border-slate-800
      bg-[#111827] p-6">

      <h3 className="mb-2 text-lg font-semibold text-white">
        Titan Cores & Utilities
      </h3>

      <p className="mb-5 text-sm text-slate-400">
        Configure component levels and weapon slots.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-300 text-left text-sm">
          <thead className="border-b border-slate-700 text-slate-400">
            <tr>
              <th colSpan={3}></th>

              <th colSpan={3}
                className="pb-2 text-center text-cyan-400">
                Next Level
              </th>

              <th colSpan={4}
                className="pb-2 text-center text-cyan-400
                  border-l border-slate-600">
                Next Milestone
              </th>

              <th></th>
            </tr>

            <tr>
              <th className="pb-3">Slot</th>
              <th className="pb-3">Component</th>
              <th className="pb-3">Level</th>

              <th className="pb-3 text-right">Cost</th>
              <th className="pb-3 text-right">Remaining</th>
              <th className="pb-3 pr-4 text-right">Time to Afford</th>

              <th className="pb-3 text-right border-l border-slate-600">Level</th>
              <th className="pb-3 text-right">Total Cost</th>
              <th className="pb-3 text-right">Remaining</th>
              <th className="pb-3 text-right">Time to Afford</th>

              <th className="pb-3"></th>
            </tr>
          </thead>       

          <tbody>
            {slots.map(slot => {
              const config = slotDefinitions.find(
                item => item.slot === slot.slot_number
              )!
 
              const availableComponents = definitions.filter(item =>
                item.component_type === config.type &&
                highestSector >= item.sector_unlock &&
                (
                  config.type !== 'Utility' ||
                  !slots.some(other =>
                    other.slot_number !== slot.slot_number &&
                    other.slot_number >= 6 &&
                    other.core_upgrade_id === item.core_upgrade_id
                  )
                )
              )
            
              const configurable =
                config.type === 'Weapon' ||
                config.type === 'Utility'

              const definition = definitions.find(
                item =>
                  item.core_upgrade_id === slot.core_upgrade_id
              )

              const locked = definition
                ? highestSector < definition.sector_unlock
                : false

                
                const validLevel =
                  Number.isSafeInteger(slot.current_level) &&
                  slot.current_level >= 0 &&
                  slot.current_level <= 2147483647
                
                const nextCost = definition && !locked && validLevel
                  ? calculateNextLevelCost(
                      String(definition.base_cost),
                      String(definition.scale),
                      slot.current_level
                    )
                  : null
                
                const resource = resources.find(
                  item => item.resource_type_id === definition?.resource_type_id
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
                  definition &&
                  !locked &&
                  validLevel &&
                  currentAmount !== null
                    ? calculateAffordableLevels(
                        String(definition.base_cost),
                        String(definition.scale),
                        slot.current_level,
                        currentAmount
                        )
                    : null
                      
                const affordability = resource && nextCost !== null
                  ? calculateTimeToAfford(
                      currentAmount,
                      getEffectiveGainRate(resource),
                      nextCost
                    )
                  : null
                
                const nextMilestone =
                  definition &&
                  !locked &&
                  validLevel &&
                  Array.isArray(definition.milestone_levels)
                    ? calculateNextMilestone(
                        slot.current_level,
                        definition.milestone_levels
                      )
                    : null

                const milestoneMaxed =
                  definition &&
                  !locked &&
                  validLevel &&
                  Array.isArray(definition.milestone_levels) &&
                  nextMilestone === null

                const milestoneCost =
                  definition && nextMilestone !== null
                    ? calculateCostToLevel(
                        String(definition.base_cost),
                        String(definition.scale),
                        slot.current_level,
                        nextMilestone
                      )
                    : null

                const milestoneAffordability =
                  resource && milestoneCost !== null
                    ? calculateTimeToAfford(
                        currentAmount,
                        getEffectiveGainRate(resource),
                        milestoneCost
                      )
                    : null
  
              return (
                <tr key={slot.slot_number}
                  className="border-b border-slate-800">
              
              {/* Slot Name  */}       
                  <td className="py-3 pr-4 text-slate-400">
                    {config.label}
                  </td>
              
              {/* Component Dropdown */}       
                    <td className="py-3 pr-4">
                    {configurable ? (
                      <select
                        value={slot.core_upgrade_id}
                        disabled={savingSlot !== null}
                        onChange={e => updateSlot(
                          slot.slot_number,
                          { core_upgrade_id: Number(e.target.value) }
                        )}
                        className="rounded-md border border-slate-700
                          bg-slate-900 px-3 py-2 text-white"
                      >
                        {availableComponents.map(component => (
                          <option
                            key={component.core_upgrade_id}
                            value={component.core_upgrade_id}
                          >
                            {component.core_upgrade_name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-white">
                        {definition?.core_upgrade_name ?? 'Unknown'}
                      </span>
                    )}
                  </td>
              
              {/* Current Level  */}       
                    <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={slot.current_level}
                        disabled={savingSlot !== null || locked}
                        onFocus={e => e.currentTarget.select()}
                        onChange={e => updateSlot(
                          slot.slot_number,
                          { current_level: Number(e.target.value) }
                        )}
                        className="w-24 rounded-md border
                          border-slate-700 bg-slate-900 px-3 py-2
                          text-white"
                      />
              
              {/* Available Levels */}
                      {affordableLevels !== null && (
                        <span
                          className={`min-w-10 font-mono text-sm ${
                            affordableLevels > 0
                              ? 'text-green-400'
                              : 'text-slate-500'
                          }`}
                          title="Additional levels currently affordable"
                        >
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
                      ? `Unlocks at sector ${definition?.sector_unlock}`
                      : !validLevel
                        ? 'Invalid level'
                        : nextCost !== null
                          ? (
                            <>
                              <span className="inline-flex items-center justify-end gap-2">
                                {formatScientific(nextCost)}

                                {(resource?.resource_name ??
                                  resourceNames[definition!.resource_type_id]) && (
                                  <img
                                    src={`${import.meta.env.BASE_URL}images/resources/${resourceImages[
                                      resource?.resource_name ??
                                      resourceNames[definition!.resource_type_id]
                                    ]}`}
                                    alt={resource?.resource_name ??
                                      resourceNames[definition!.resource_type_id]}
                                    className="h-5 w-5 shrink-0 object-contain"
                                  />
                                )}
                              </span>                           
                            </>
                          )
                          : 'Unavailable'}
                  </td>

                {/* Remaining */}  
                    <td className="py-3 pl-4 text-right">
                      <AffordabilityProgress
                        currentAmount={currentAmount}
                        targetCost={nextCost}
                        resourceName={resource?.resource_name}
                        gainActive={resource?.gain_active}
                      />
                    </td>
                
                {/* Time to Afford */}      
                    <td className={`py-3 pl-4 pr-4 text-right font-mono ${
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
                
                {/* MIILESTONE - Next Level  */}      
                  <td className="py-3 pl-4 text-right font-mono text-white
                    border-l border-slate-600">
                    {milestoneMaxed
                      ? 'Maxed'
                      : nextMilestone ?? '—'}
                  </td>
                
                {/* MIILESTONE - Level Cost  */}  
                  <td className="py-3 pl-4 text-right font-mono text-cyan-400">
                    {milestoneCost !== null
                      ? formatScientific(milestoneCost)
                      : '—'}
                  </td>
                
                {/* MIILESTONE - Remaining */}  
                  <td className="py-3 pl-4 text-right">
                    <AffordabilityProgress
                      currentAmount={currentAmount}
                      targetCost={milestoneCost}
                      resourceName={resource?.resource_name}
                      gainActive={resource?.gain_active}
                    />
                  </td>
                
                {/* MIILESTONE - Time to Afford  */}  
                  <td className={`py-3 pl-4 text-right font-mono ${
                    milestoneAffordability?.status === 'ready'
                      ? 'text-green-400'
                      : 'text-slate-300'
                  }`}>
                    {milestoneAffordability
                      ? formatTimeToAfford(milestoneAffordability)
                      : '—'}
                  </td>
                
                {/* Save Button */}  
                  <td className="py-3 pl-4 text-right">
                    <button
                      type="button"
                      disabled={savingSlot !== null || locked}
                      onClick={() => void saveSlot(slot)}
                      className="rounded-md bg-cyan-500 px-4 py-2
                        font-medium text-slate-950
                        hover:bg-cyan-400 disabled:opacity-50"
                    >
                      {savingSlot === slot.slot_number
                        ? 'Saving...'
                        : 'Save'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p role="status" className="mt-4 text-sm text-slate-400">
        {message}
      </p>
    </section>
  )
}
