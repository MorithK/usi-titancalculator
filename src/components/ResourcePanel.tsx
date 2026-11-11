
import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'
import { calculateCurrentAmount, calculateCurrentAmountExact } from '../utils/resourceMath'

const resourceImages: Record<string, string> = {
  Capital: 'capital.svg',
  Veil: 'veil.svg',
  Antum: 'antum.svg',
  Penum: 'penum.svg'
}

type Resource = {
  resource_type_id: number
  resource_name: string
  resource_amt: string
  resource_gain_rate: string
  last_update: string | null
}

export default function ResourcePanel({
  userId
}: {
  userId: string
}) {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [editingAmountId, setEditingAmountId] = useState<number | null>(null)
  const [amountDraft, setAmountDraft] = useState('') 
 
  useEffect(() => {
    let cancelled = false

    void supabase
      .from('player_resource_overview')
      .select(
        'resource_type_id, resource_name, resource_amt, resource_gain_rate, last_update'
      )
      .eq('resource_type', 'Fragment')
      .order('resource_type_id')
      .then(({ data, error }) => {
        if (cancelled) return

        if (error) {
          setLoadError(error.message)
        } else {
          setResources(
            (data ?? []).map(row => ({
              resource_type_id: row.resource_type_id,
              resource_name: row.resource_name,
              resource_amt: row.resource_amt ?? '0',
              resource_gain_rate: row.resource_gain_rate ?? '0',
              last_update: row.last_update,
            }))
          )
        }

        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now())
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  async function persistResource(
    resource: Resource,
    newAmount: string,
    newRate: string,
    savedAt: string
  ): Promise<boolean> {
    if (savingId !== null) return false

    setSavingId(resource.resource_type_id)
    setMessage('')

    try {
      const { error } = await supabase
        .from('player_resources')
        .upsert({
          user_id: userId,
          resource_type_id: resource.resource_type_id,
          resource_amt: newAmount,
          resource_gain_rate: newRate,
          last_update: savedAt
        }, {
          onConflict: 'user_id,resource_type_id'
        })

      if (error) {
        setMessage(`Save failed: ${error.message}`)
        return false
      }

      // The save succeeded. Update our local baseline.
      setResources(current =>
        current.map(row =>
          row.resource_type_id === resource.resource_type_id
            ? {
                ...row,
                resource_amt: newAmount,
                resource_gain_rate: newRate,
                last_update: savedAt
              }
            : row
        )
      )

      setMessage(`${resource.resource_name} saved.`)
      return true

    } catch (error) {
      setMessage(
        `Save failed: ${error instanceof Error
          ? error.message
          : 'Unknown error'}`
      )
      return false

    } finally {
      setSavingId(null)
    }
  }

  const numericPattern =
    /^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i

  async function commitGainRate(
    resource: Resource,
    typedRate: string
  ) {
    const newRate = typedRate.trim()

    // Nothing changed, so no need to save.
    if (newRate === resource.resource_gain_rate) return

    if (!numericPattern.test(newRate)) {
      setMessage('Invalid gain rate. Use a non-negative number.')
      return
    }

    // Capture one timestamp for the entire transition.
    const savedAt = new Date().toISOString()

    // IMPORTANT: Calculate using the OLD rate.
    const currentAmount = calculateCurrentAmountExact(
      resource.resource_amt,
      resource.resource_gain_rate,
      resource.last_update,
      Date.parse(savedAt)
    )

    if (currentAmount === null) {
      setMessage('Unable to calculate the current balance.')
      return
    }

    // Save accumulated balance and NEW rate together.
    await persistResource(
      resource,
      currentAmount,
      newRate,
      savedAt
    )
  }

  function beginAmountEdit(resource: Resource) {
    const currentAmount = calculateCurrentAmountExact(
      resource.resource_amt,
      resource.resource_gain_rate,
      resource.last_update,
      Date.now()
    )

    setAmountDraft(currentAmount ?? resource.resource_amt)
    setEditingAmountId(resource.resource_type_id)
    setMessage('')
  }

  async function commitAmountEdit(resource: Resource) {
    const newAmount = amountDraft.trim()

    if (!numericPattern.test(newAmount)) {
      setMessage('Invalid resource amount.')
      return
    }

    const savedAt = new Date().toISOString()

    // Manual correction becomes the new baseline.
    const success = await persistResource(
      resource,
      newAmount,
      resource.resource_gain_rate,
      savedAt
    )

    if (success) {
      setEditingAmountId(null)
    }
  }


  if (loading) return <p>Loading resources...</p>

  if (loadError) {
    return <p role="alert" className="text-red-400">{loadError}</p>
  }

  return (
    <section className="rounded-xl border border-slate-800
      bg-[#111827] p-6">
      <h3 className="mb-2 text-lg font-semibold text-white">
        Fragments
      </h3>

      <p className="mb-5 text-sm text-slate-400">
        Current resource balances and generation rates.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-150 text-left text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="pb-3">Resource</th>
              <th className="pb-3">Current Amount</th>
              <th className="pb-3">Gain / sec</th>
            </tr>
          </thead>

          <tbody>
            {resources.map(resource => (
              <tr
                key={resource.resource_type_id}
                className="border-b border-slate-800"
              >
                <td className="py-3 pr-4 font-medium text-white">
                  <div className="flex items-center gap-3">

                    {resourceImages[resource.resource_name] && (
                      <img
                        src={`${import.meta.env.BASE_URL}images/resources/${resourceImages[resource.resource_name]}`}
                        alt=""
                        aria-hidden="true"
                        className="h-8 w-8 shrink-0 object-contain"
                      />
                    )}

                    <span>{resource.resource_name}</span>

                  </div>
                </td>
                
                <td className="py-3 pr-3">
                  {editingAmountId === resource.resource_type_id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        aria-label={`${resource.resource_name} amount`}
                        value={amountDraft}
                        onChange={e => setAmountDraft(e.target.value)}
                        disabled={savingId !== null}
                        className="min-w-0 w-44 rounded-md border border-slate-700
                          bg-slate-900 px-3 py-2 font-mono text-cyan-400"
                      />

                      <button
                        type="button"
                        disabled={savingId !== null}
                        onClick={() => void commitAmountEdit(resource)}
                        className="text-sm text-emerald-400 hover:underline
                          disabled:opacity-50"
                      >
                        Save
                      </button>

                      <button
                        type="button"
                        disabled={savingId !== null}
                        onClick={() => setEditingAmountId(null)}
                        className="text-sm text-slate-400 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-emerald-400">
                        {calculateCurrentAmount(
                          resource.resource_amt,
                          resource.resource_gain_rate,
                          resource.last_update,
                          nowMs
                        ) ?? 'Unavailable'}
                      </span>

                      <button
                        type="button"
                        disabled={savingId !== null}
                        onClick={() => beginAmountEdit(resource)}
                        className="text-xs text-slate-400 hover:text-cyan-400
                          disabled:opacity-50"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </td>

                <td className="py-3 pr-3">
                  <input
                    key={`${resource.resource_type_id}-${resource.last_update ?? 'new'}`}
                    type="text"
                    aria-label={`${resource.resource_name} gain rate`}
                    defaultValue={resource.resource_gain_rate}
                    disabled={
                      savingId !== null ||
                      editingAmountId === resource.resource_type_id
                    }
                    onBlur={e =>
                      void commitGainRate(resource, e.currentTarget.value)
                    }
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        e.currentTarget.blur()
                      }
                    }}
                    className="w-full rounded-md border border-slate-700
                      bg-slate-900 px-3 py-2 font-mono text-white
                      focus:border-cyan-400 focus:outline-none
                      disabled:opacity-50"
                  />
                </td>
              </tr>
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
