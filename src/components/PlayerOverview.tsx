
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";

type RegionalProgression = {
  region_id: number;
  historical_highest: number;
  current_run_highest: number;
  cleared_sector_ids: string[];
};

type VeilState = {
  current_region_id: number;
  current_sector: number;
  current_sector_id: string;
  next_umbra_sector: number;
  last_update: string;
};

type OverviewData = {
  regions: RegionalProgression[];
  veil: VeilState | null;
};

const REGIONS = [
  { id: 1, name: "Surface" },
  { id: 2, name: "Antumbra" },
  { id: 3, name: "Penumbra" },
  { id: 4, name: "Umbra" },
];

function regionName(id: number): string {
  return REGIONS.find(r => r.id === id)?.name ?? "Unknown";
}

function sectorLabel(veil: VeilState): string {
  const match = veil.current_sector_id.match(/_([ab])$/i);
  const variant = match ? match[1].toUpperCase() : "";

  return `${veil.current_sector}${variant}`;
}

export default function PlayerOverview({
  userId,
  highestSector,
  farmingRegion,
  revision,
}: {
  userId: string;
  highestSector: number;
  farmingRegion: number;
  revision: number;
}) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProgression() {
      setLoading(true);
      setError(null);

      const [regionsResult, veilResult] = await Promise.all([
        supabase
          .from("player_region_progression")
          .select(
            "region_id, historical_highest, current_run_highest, cleared_sector_ids"
          )
          .eq("user_id", userId),

        supabase
          .from("player_veil_state")
          .select(
            "current_region_id, current_sector, current_sector_id, next_umbra_sector, last_update"
          )
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      if (regionsResult.error || veilResult.error) {
        setError(
          regionsResult.error?.message ??
          veilResult.error?.message ??
          "Unable to load progression."
        );
        setLoading(false);
        return;
      }

      setData({
        regions: regionsResult.data ?? [],
        veil: veilResult.data ?? null,
      });

      setLoading(false);
    }

    void loadProgression();

    return () => {
      cancelled = true;
    };
  }, [userId, revision]);

  const veil = data?.veil ?? null;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-800 bg-[#111827] p-6">
        <h3 className="text-lg font-semibold text-white">
          Player Overview
        </h3>
        <p className="mt-1 text-sm text-slate-400">
          Your calculator's persistent player state.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <p className="text-xs text-slate-400">
              Highest Sector
            </p>
            <p className="mt-1 text-xl font-semibold text-white">
              {highestSector}
            </p>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <p className="text-xs text-slate-400">
              Active Farming Region
            </p>
            <p className="mt-1 text-xl font-semibold text-cyan-400">
              {regionName(farmingRegion)}
            </p>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <p className="text-xs text-slate-400">
              Recorded Current Sector
            </p>
            <p className="mt-1 text-xl font-semibold text-white">
              {veil ? sectorLabel(veil) : "Not imported"}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-[#111827] p-6">
        <h3 className="text-lg font-semibold text-white">
          Veil Progression
        </h3>

        {loading ? (
          <p className="mt-4 text-sm text-slate-400">
            Loading progression...
          </p>
        ) : error ? (
          <p role="alert" className="mt-4 text-sm text-red-400">
            {error}
          </p>
        ) : !veil || !data?.regions.length ? (
          <p className="mt-4 text-sm text-slate-400">
            No progression data saved yet. Import a game save
            to populate your regional progression.
          </p>
        ) : (
          <div className="mt-5 space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-900 p-4">
                <p className="text-xs text-slate-400">
                  Recorded Region
                </p>
                <p className="mt-1 font-semibold text-white">
                  {regionName(veil.current_region_id)}
                </p>
              </div>

              <div className="rounded-lg bg-slate-900 p-4">
                <p className="text-xs text-slate-400">
                  Recorded Sector
                </p>
                <p className="mt-1 font-semibold text-white">
                  {sectorLabel(veil)}
                </p>
              </div>

              <div className="rounded-lg bg-slate-900 p-4">
                <p className="text-xs text-slate-400">
                  Next Umbra Sector
                </p>
                <p className="mt-1 font-semibold text-white">
                  {veil.next_umbra_sector}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-700">
              <table className="w-full text-sm">
                <thead className="bg-slate-900 text-slate-400">
                  <tr>
                    <th className="p-3 text-left">Region</th>
                    <th className="p-3 text-right">
                      Historical
                    </th>
                    <th className="p-3 text-right">
                      Current Run
                    </th>
                    <th className="p-3 text-right">
                      Cleared Encounters
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {[...data.regions]
                    .sort((a, b) => a.region_id - b.region_id)
                    .map(item => (
                      <tr
                        key={item.region_id}
                        className="border-t border-slate-800"
                      >
                        <td className="p-3 text-slate-200">
                          {regionName(item.region_id)}
                        </td>
                        <td className="p-3 text-right text-white">
                          {item.historical_highest}
                        </td>
                        <td className="p-3 text-right text-white">
                          {item.current_run_highest}
                        </td>
                        <td className="p-3 text-right text-slate-300">
                          {item.cleared_sector_ids.length}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-slate-500">
              Historical and current-run values refer to the
              highest numerical sectors entered. Cleared
              encounters are tracked individually, including
              A/B variants.
            </p>

            <p className="text-xs text-slate-500">
              Last progression snapshot:{" "}
              {new Date(veil.last_update).toLocaleString()}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
