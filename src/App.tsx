
import type { User } from '@supabase/supabase-js'
import { supabase } from './utils/supabase'
import AppShell from './components/AppShell'
import PlayerSettings from './components/PlayerSettings'
import Login from './components/PlayerLogin'
import { useEffect, useState } from 'react'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [highestSector, setHighestSector] = useState(150)
  const [region, setRegion] = useState(1)
  const [saveMessage, setSaveMessage] = useState('')

  async function savePlayerData() {
    if (!user) return

    const { error } = await supabase
      .from('player_saves')
      .upsert({
        user_id: user.id,
        highest_sector: highestSector,
        region_id: region,
        last_update: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (error) {
      setSaveMessage(`Error: ${error.message}`)
    } else {
      setSaveMessage('Player data saved successfully!')
    }
    }

    useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      })

    return () => subscription.unsubscribe()
  }, [])

  const userId = user?.id

  useEffect(() => {
    if (!userId) return

    let cancelled = false

    void supabase
      .from('player_saves')
      .select('highest_sector, region_id')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return

        if (error) {
          console.error('Error loading player data:', error)
          return
        }

        if (data) {
          setHighestSector(data.highest_sector)
          setRegion(data.region_id)
        }
      })

    return () => {
      cancelled = true
    }
  }, [userId])


async function handleLogin() {
  setError('')

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    setError(error.message)
  }
}

  if (loading) return <p>Loading...</p>

if (!user) {
  return (
    <Login
      email={email}
      password={password}
      error={error}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onLogin={handleLogin}
    />
  )
}

return (
<AppShell
  userEmail={user.email ?? 'Signed in'}
  onSignOut={() => void supabase.auth.signOut()}
>
  <PlayerSettings
    highestSector={highestSector}
    region={region}
    saveMessage={saveMessage}
    onSectorChange={setHighestSector}
    onRegionChange={setRegion}
    onSave={() => void savePlayerData()}
  />
</AppShell>)
}


