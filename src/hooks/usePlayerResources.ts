
import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'

export type Resource = {
  resource_type_id: number
  resource_name: string
  resource_amt: string
  resource_gain_rate: string
  last_update: string | null
  gain_active: boolean
}

export function usePlayerResources(userId: string, resourceRevision: number) {
  const [resources, setResources] = useState<Resource[]>([])
  const [loadedRevision, setLoadedRevision] = useState<number | null>(null)
  const loading = loadedRevision !== resourceRevision
  const [loadError, setLoadError] = useState('')
  const [nowMs, setNowMs] = useState(Date.now)

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    let cancelled = false

    void supabase
      .from('player_resource_overview')
      .select(`
        resource_type_id,
        resource_name,
        resource_amt,
        resource_gain_rate,
        last_update,
        gain_active
      `)
      .eq('resource_type', 'Fragment')
      .order('resource_type_id')
      .then(({ data, error }) => {
        if (cancelled) return

        if (error) {
          setLoadError(error.message)
        } else {
          setResources(
            (data ?? []).map(row => ({
              ...row,
              resource_amt: row.resource_amt ?? '0',
              resource_gain_rate: row.resource_gain_rate ?? '0'
            }))
          )
        }

        setLoadedRevision(resourceRevision)
        })

    return () => {
      cancelled = true
    }
  }, [userId, resourceRevision])

  return {
    resources: loading ? [] : resources,
    setResources,
    loading,
    loadError,
    nowMs
  }
}
