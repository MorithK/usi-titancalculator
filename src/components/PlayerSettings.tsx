
type PlayerSettingsProps = {
  highestSector: number
  region: number
  saveMessage: string
  onSectorChange: (value: number) => void
  onRegionChange: (value: number) => void
  onSave: () => void
}

export default function PlayerSettings({
  highestSector,
  region,
  saveMessage,
  onSectorChange,
  onRegionChange,
  onSave
}: PlayerSettingsProps) {
  return (
    <section className="max-w-2xl rounded-xl border
      border-slate-800 bg-[#111827] p-6">

      <h3 className="mb-2 text-lg font-semibold text-white">
        Player Settings
      </h3>

      <p className="mb-6 text-sm text-slate-400">
        Configure your current Titan progression.
      </p>

      <div className="grid gap-6 sm:grid-cols-2">

        <div>
          <label htmlFor="sector"
            className="mb-2 block text-sm text-slate-300">
            Highest Sector
          </label>

          <input
            id="sector"
            type="number"
            min={150}
            value={highestSector}
            onChange={e =>
              onSectorChange(Number(e.target.value))
            }
            className="w-full rounded-lg border border-slate-700
              bg-slate-900 px-3 py-2 text-white
              focus:border-cyan-400 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="region"
            className="mb-2 block text-sm text-slate-300">
            Region
          </label>

          <select
            id="region"
            value={region}
            onChange={e =>
              onRegionChange(Number(e.target.value))
            }
            className="w-full rounded-lg border border-slate-700
              bg-slate-900 px-3 py-2 text-white
              focus:border-cyan-400 focus:outline-none"
          >
            <option value={1}>Surface</option>
            <option value={2}>Antumbra</option>
            <option value={3}>Penumbra</option>
            <option value={4}>Umbra</option>
          </select>
        </div>

      </div>

      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={onSave}
          className="rounded-lg bg-cyan-500 px-5 py-2
            font-medium text-slate-950 hover:bg-cyan-400"
        >
          Save Changes
        </button>

        <span role="status" className="text-sm text-slate-400">
          {saveMessage}
        </span>
      </div>
    </section>
  )
}
