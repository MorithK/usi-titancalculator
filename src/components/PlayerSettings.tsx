
type PlayerSettingsProps = {
  region: number;
  saveMessage: string;
  onRegionChange: (value: number) => void;
  onSave: () => void;
};

export default function PlayerSettings({
  region,
  saveMessage,
  onRegionChange,
  onSave,
}: PlayerSettingsProps) {
  return (
    <section className="rounded-xl border border-slate-800 bg-[#111827] p-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[220px] flex-1 sm:flex-none">
          <label
            htmlFor="farming-region"
            className="mb-2 block text-sm font-medium text-slate-200"
          >
            Active Farming Region
          </label>

          <select
            id="farming-region"
            value={region}
            onChange={event =>
              onRegionChange(Number(event.target.value))
            }
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
          >
            <option value={1}>Surface</option>
            <option value={2}>Antumbra</option>
            <option value={3}>Penumbra</option>
            <option value={4}>Umbra</option>
          </select>
        </div>

        <button
          type="button"
          onClick={onSave}
          className="rounded-lg bg-cyan-500 px-5 py-2 font-medium text-slate-950 hover:bg-cyan-400"
        >
          Apply Region
        </button>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Applying a region change updates persistent farming
        state and accounts for accumulated fragment production
        in the previous region.
      </p>

      {saveMessage && (
        <p role="status" className="mt-3 text-sm text-slate-300">
          {saveMessage}
        </p>
      )}
    </section>
  );
}
