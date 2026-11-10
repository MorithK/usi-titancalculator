
import { useState, useEffect, type SubmitEvent  } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from './utils/supabase'

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


  async function handleLogin(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) setError(error.message)
  }

  if (loading) return <p>Loading...</p>

  if (!user) {
    return (
      <main>
        <h1>USI Titan Calculator</h1>
        <h2>Login</h2>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          <button type="submit">Login</button>
        </form>

        {error && <p role="alert">{error}</p>}
      </main>
    )
  }

  return (


    <main>
      <h1>USI Titan Calculator</h1>
      <p>Welcome, {user.email}</p>

      <button onClick={() => void supabase.auth.signOut()}>
        Log Out
      </button>

      <h2>Titan Dashboard</h2>

      <div>
        <label htmlFor="sector">Highest Sector:</label>
        <input
          id="sector"
          type="number"
          min="150"
          value={highestSector}
          onChange={(e) => setHighestSector(Number(e.target.value))}
        />
      </div>

      <div>
        <label htmlFor="region">Region:</label>
        <select
          id="region"
          value={region}
          onChange={(e) => setRegion(Number(e.target.value))}
        >
          <option value="1">Surface</option>
          <option value="2">Antumbra</option>
          <option value="3">Penumbra</option>
          <option value="4">Umbra</option>
        </select>
      </div>

      <button onClick={savePlayerData}>
        Save Player Data
      </button>

      <p>{saveMessage}</p>
    </main>
  )
}


