
import { useState, type ReactNode } from 'react'
import {
  LayoutDashboard,
  Layers,
  Orbit,
  Users,
  FlaskConical,
  GitCompareArrows,
  LogOut,
  type LucideIcon
} from 'lucide-react'

type Section =
  | 'overview'
  | 'core'
  | 'warp'
  | 'crew'
  | 'synth'
  | 'simulation'

type NavItem = {
  id: Section
  label: string
  icon: LucideIcon
}

const navigation: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'core', label: 'Core & Upgrades', icon: Layers },
  { id: 'warp', label: 'Warp', icon: Orbit },
  { id: 'crew', label: 'Crew', icon: Users },
  { id: 'synth', label: 'Synth', icon: FlaskConical },
  { id: 'simulation', label: 'Simulation', icon: GitCompareArrows }
]

type AppShellProps = {
  userEmail: string
  onSignOut: () => void
  children: ReactNode
}

export default function AppShell({
  userEmail,
  onSignOut,
  children
}: AppShellProps) {
  const [section, setSection] = useState<Section>('core')

  function navigationButton(item: NavItem) {
    const active = section === item.id
    const Icon = item.icon

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => setSection(item.id)}
        aria-current={active ? 'page' : undefined}
        className={`flex items-center gap-3 rounded-lg px-4 py-3
          text-sm font-medium transition-colors
          ${active
            ? 'bg-cyan-400/10 text-cyan-300'
            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
      >
        <Icon size={18} />
        <span className="whitespace-nowrap">{item.label}</span>
      </button>
    )
  }

  const selectedSection = navigation.find(
    item => item.id === section
  )

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200">

      {/* Application header */}
      <header className="flex min-h-16 items-center justify-between
        border-b border-slate-800 bg-[#111827] px-6">

        <div>
          <h1 className="text-lg font-bold tracking-wide text-cyan-400">
            USI TITAN
          </h1>
          <p className="text-xs text-slate-500">
            Progression Calculator & Planner
          </p>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-slate-400 sm:block">
            {userEmail}
          </span>

          <button
            type="button"
            onClick={onSignOut}
            className="flex items-center gap-2 rounded-lg
              border border-slate-700 px-3 py-2 text-sm
              hover:bg-slate-800"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">

        {/* Desktop navigation */}
        <aside className="hidden min-h-[calc(100vh-4rem)]
          flex-col border-r border-slate-800
          bg-[#111827] p-4 lg:flex">

          <p className="mb-4 px-4 text-xs font-semibold
            uppercase tracking-widest text-slate-500">
            Navigation
          </p>

          <nav className="flex flex-col gap-1">
            {navigation.map(navigationButton)}
          </nav>
        </aside>

        {/* Small-screen navigation */}
        <nav className="flex gap-1 overflow-x-auto border-b
          border-slate-800 bg-[#111827] p-2 lg:hidden">
          {navigation.map(navigationButton)}
        </nav>

        {/* Main workspace */}
        <main className="min-w-0 p-4 lg:p-8">

          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-white">
              {selectedSection?.label}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Titan progression and planning workspace
            </p>
          </div>

          {section === 'core' ? (
            children
          ) : (
            <div className="rounded-xl border border-slate-800
              bg-[#111827] p-8">
              <h3 className="text-lg font-semibold text-white">
                {selectedSection?.label}
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                This section is ready for development.
              </p>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
