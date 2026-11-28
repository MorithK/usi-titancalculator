
import type { User } from '@supabase/supabase-js'
import { supabase } from './utils/supabase'
import AppShell from './components/AppShell'
import PlayerSettings from './components/PlayerSettings'
import Login from './components/PlayerLogin'
import { useEffect, useState, useRef  } from 'react'
import CorePanel from './components/CorePanel'
import { applyPurchasePreview, type ApplyPurchases } from './utils/purchaseApi'
import { type WriteGuard } from './utils/writeGuard'
import { importPlayerSnapshot, type ApplyResourceImport } from "@/lib/saveImport/importApi";
import SaveImportPanel from "@/components/SaveImportPanel";
import PlayerOverview from "./components/PlayerOverview";
import WarpPanel from "./components/WarpPanel";
import { loadPublicImportDefinitions } from  "@/lib/saveImport/importDefinitions";

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [highestSector, setHighestSector] = useState(150)
  const [region, setRegion] = useState(1)
  const [savedRegion, setSavedRegion] = useState(1)
  
  const [saveMessage, setSaveMessage] = useState('')
  const [resourceRevision, setResourceRevision] = useState(0)
  const [progressionRevision, setProgressionRevision] = useState(0)
  
  const writeLock = useRef(false)
  const [writing, setWriting] = useState(false)

  
  /**
   * TEMPORARY ARCH-2 TEST
   *
   * Verifies that game reference definitions can be loaded
   * without an authenticated Supabase user.
   *
   * Remove this effect after completing the test.
   */
  useEffect(() => {
    /**
     * Executes the public reference-data loader and reports
     * the number of definitions returned by each query.
     */
    async function testPublicDefinitions() {
      try {
        const definitions =
          await loadPublicImportDefinitions();
  
        console.log("ARCH-2 Public Definitions Test:", {
          core: definitions.core.length,
          crew: definitions.crew.length,
          warps: definitions.warps.length,
          nodes: definitions.nodes.length
        });
  
      } catch (error) {
        console.error(
          "ARCH-2 Public Definitions Test Failed:",
          error
        );
      }
    }
  
    void testPublicDefinitions();
  }, []);
  

  const writeGuard: WriteGuard = {
    begin: () => {
      if (writeLock.current) return false
  
      writeLock.current = true
      setWriting(true)
      return true
    },
  
    end: () => {
      writeLock.current = false
      setWriting(false)
    }
  }
  
  async function savePlayerData() {
    if (!user || !writeGuard.begin()) return
  
    try {
      const { error } = await supabase.rpc(
        'save_player_settings',
        {
          p_highest_sector: highestSector,
          p_region_id: region
        }
      )
  
      if (error) {
        setSaveMessage(`Error: ${error.message}`)
      } else {
        setSaveMessage('Player data saved successfully!')
        setResourceRevision(previous => previous + 1)
        setSavedRegion(region);
      }
    } catch (error) {
      setSaveMessage(
        error instanceof Error
          ? error.message
          : 'Unable to save settings.'
      )
    } finally {
      writeGuard.end()
    }
  }
  
  const applyPurchases: ApplyPurchases = async (
    purchaseType,
    preview
  ) => {
    if (!writeGuard.begin()) {
      throw new Error('Another save is in progress.')
    }
  
    try {
      const result = await applyPurchasePreview(
        purchaseType,
        preview
      )
  
      setResourceRevision(previous => previous + 1)
  
      return result
  
    } finally {
      writeGuard.end()
    }
  }
  
  const applyResourceImport: ApplyResourceImport =
    async (
      resources, 
      progression, 
      titanComponents, 
      warps, 
      crewUpgrades) => {
      if (!writeGuard.begin()) {
        throw new Error("Another save is in progress.");
      }
  
      try {
        const result = await importPlayerSnapshot(
          resources,
          progression,
          titanComponents,
          warps,
          crewUpgrades
        );

        setHighestSector(result.highest_sector);
        setRegion(result.region_id);
        setSavedRegion(result.region_id);
        setSaveMessage("");
  
        setResourceRevision(previous => previous + 1);
        setProgressionRevision(previous => previous + 1);
  
        return result;
      } finally {
        writeGuard.end();
      }
    };
  
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
          setSavedRegion(data.region_id)
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
      key={user.id}
      userEmail={user.email ?? 'Signed in'}
      onSignOut={() => void supabase.auth.signOut()}
      navigationDisabled={writing}
      
      sections={{
        overview: (
          <PlayerOverview
            userId={user.id}
            highestSector={highestSector}
            farmingRegion={savedRegion}
            revision={progressionRevision}
          />        
        ),
      
        core: (
          <fieldset
            disabled={writing}
            className="min-w-0 space-y-6 border-0 p-0"
          >
            <PlayerSettings
              region={region}
              saveMessage={saveMessage}
              onRegionChange={setRegion}
              onSave={() => void savePlayerData()}
            />
      
            <CorePanel
              userId={user.id}
              highestSector={highestSector}
              resourceRevision={resourceRevision}
              writeGuard={writeGuard}
              onApplyPurchases={applyPurchases}
            />
          </fieldset>
        ),
      
        saveImport: (
          <fieldset
            disabled={writing}
            className="min-w-0 space-y-6 border-0 p-0"
          >
            <SaveImportPanel
              onApplyResourceImport={applyResourceImport}
            />
          </fieldset>
        ),

        warp: (
          <WarpPanel
            userId={user.id}
            revision={resourceRevision}
          />
        ),
      }}
    />
  )
  }


