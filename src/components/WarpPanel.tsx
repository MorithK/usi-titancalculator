
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/utils/supabase";
import { loadWarpNodes } from "@/lib/warp/loadWarpData";
import { calculateWarpObjective, type WarpNode } from "@/lib/warp/warpPlanner";
import { calculateWarpTime, formatWarpDuration } from "@/lib/warp/warpTiming";

type WarpInfo = {
  warp_id: number;
  warp_name: string;
};

type Props = {
  userId: string;
  revision: number;
};

export default function WarpPanel({ userId, revision }: Props) {
  const [warps, setWarps] = useState<WarpInfo[]>([]);
  const [warpId, setWarpId] = useState(3);
  const [nodes, setNodes] = useState<WarpNode[]>([]);
  const [skein, setSkein] = useState("0");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [targetId, setTargetId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tetheredWarpId, setTetheredWarpId] = useState<number | null>(null);
  const [chargeSeconds, setChargeSeconds] = useState("37");
  const [dischargeSeconds, setDischargeSeconds] = useState("1849");
  const [remainingDischarge, setRemainingDischarge] = useState("1849");
  const [skeinPerCharge, setSkeinPerCharge] = useState("43.39");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [warpResult, 
                playerResult, 
                loadedNodes,
                tetherResult,] =
          await Promise.all([
            supabase
              .from("warps")
              .select("warp_id,warp_name")
              .order("warp_id"),

            supabase
              .from("player_warps")
              .select("current_skein::text")
              .eq("user_id", userId)
              .eq("warp_id", warpId)
              .maybeSingle(),

            loadWarpNodes(userId, warpId),

            supabase
                .from("player_warp_state")
                .select("tethered_warp_id")
                .eq("user_id", userId)
                .maybeSingle(),
          ]);


        if (warpResult.error) throw warpResult.error;
        if (playerResult.error) throw playerResult.error;
        if (tetherResult.error) throw tetherResult.error;
        if (cancelled) return;

        setWarps(
          (warpResult.data ?? []).filter(
            warp => warp.warp_id <= 3
          )
        );
        setNodes(loadedNodes);
        setSkein(playerResult.data?.current_skein ?? "0");
        setSelected(new Set());
        setTargetId(null);
        setTetheredWarpId(tetherResult.data?.tethered_warp_id ?? null);
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load Warp data."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [userId, warpId, revision]);

  const result = useMemo(() => {
    if (targetId === null) return null;

    return calculateWarpObjective(
      targetId,
      nodes,
      selected,
      skein
    );
  }, [targetId, nodes, selected, skein]);

  const nodeResults = useMemo(() => {
    return new Map(
      nodes.map(node => [
        node.id,
        calculateWarpObjective(
          node.id,
          nodes,
          selected,
          skein
        ),
      ])
    );
  }, [nodes, selected, skein]);

  const nodeTimes = useMemo(() => {
    const times = new Map<number, string>();
  
    if (warpId !== tetheredWarpId) {
      return times;
    }
  
    const charge = Number(chargeSeconds);
    const discharge = Number(dischargeSeconds);
    const remaining = Number(remainingDischarge);
  
    const valid =
      chargeSeconds.trim() !== "" &&
      dischargeSeconds.trim() !== "" &&
      remainingDischarge.trim() !== "" &&
      skeinPerCharge.trim() !== "" &&
      Number.isFinite(charge) &&
      Number.isFinite(discharge) &&
      Number.isFinite(remaining) &&
      charge >= 0 &&
      discharge >= 0 &&
      remaining >= 0 &&
      remaining <= discharge &&
      charge + discharge > 0;
  
    if (!valid) return times;
  
    for (const node of nodes) {
      if (!selected.has(node.id)) continue;
  
      const result = nodeResults.get(node.id);
  
      if (
        !result ||
        result.remainingSkein === null ||
        result.status === "locked" ||
        result.status === "maxed"
      ) {
        continue;
      }
  
      try {
        const seconds = calculateWarpTime({
          remainingSkein: result.remainingSkein,
          skeinPerCharge,
          chargeSeconds: charge,
          dischargeSeconds: discharge,
          remainingDischargeSeconds: remaining,
        });
  
        times.set(
          node.id,
          seconds === 0
            ? "Available"
            : formatWarpDuration(seconds)
        );
      } catch {
        // Invalid cycle inputs should not crash the panel.
      }
    }
  
    return times;
  }, [
    nodes,
    nodeResults,
    selected,
    warpId,
    tetheredWarpId,
    chargeSeconds,
    dischargeSeconds,
    remainingDischarge,
    skeinPerCharge,
  ]);

  function toggleNode(id: number, checked: boolean) {
    setSelected(previous => {
      const next = new Set(previous);

      if (checked) next.add(id);
      else next.delete(id);

      return next;
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {warps.map(warp => (
          <button
            key={warp.warp_id}
            type="button"
            onClick={() => setWarpId(warp.warp_id)}
            className={`rounded-lg border px-4 py-2 ${
              warpId === warp.warp_id
                ? "border-cyan-400 text-cyan-300"
                : "border-slate-700 text-slate-400"
            }`}
          >
            {warp.warp_name}
          </button>
        ))}
      </div>

      {loading && <p>Loading Warp data...</p>}

      {error && <p className="text-red-400">{error}</p>}

      {!loading && !error && (
        <>
          <div className="rounded-xl border border-slate-700 p-4">
            <p className="text-sm text-slate-400">
              Current Skein
            </p>
            <p className="text-xl font-semibold">
              {skein}
            </p>
          </div>

          <div className="rounded-xl border border-slate-700 p-4 space-y-4">
        <div>
            <h3 className="font-semibold text-white">
            Warp Cycle Settings
            </h3>
            <p className="text-xs text-slate-400">
            Temporary manual inputs for time-to-afford calculations.
            </p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
            {
                label: "Charge (seconds)",
                value: chargeSeconds,
                setter: setChargeSeconds,
            },
            {
                label: "Discharge (seconds)",
                value: dischargeSeconds,
                setter: setDischargeSeconds,
            },
            {
                label: "Remaining Discharge (seconds)",
                value: remainingDischarge,
                setter: setRemainingDischarge,
            },
            {
                label: "Skein per Charge",
                value: skeinPerCharge,
                setter: setSkeinPerCharge,
            },
            ].map(field => (
            <label key={field.label} className="space-y-2">
                <span className="text-xs text-slate-400">
                {field.label}
                </span>

                <input
                type="number"
                min="0"
                step="any"
                value={field.value}
                onChange={event =>
                    field.setter(event.target.value)
                }
                className="w-full rounded-lg border border-slate-700
                    bg-slate-900 px-3 py-2 text-white"
                />
            </label>
            ))}
        </div>

        {warpId !== tetheredWarpId && (
            <p className="text-sm text-amber-400">
            Time estimates are available only for the
            currently tethered Warp.
            </p>
        )}
        </div>

        {result && (
            <div className="rounded-xl border border-cyan-800 p-5 space-y-2">
              <h3 className="font-semibold text-cyan-300">
                Objective: {
                  nodes.find(node => node.id === targetId)?.name
                }
              </h3>

              <p>Status: {result.status}</p>
              <p>Total cost: {result.totalCost ?? "—"}</p>
              <p>
                Remaining Skein: {result.remainingSkein ?? "—"}
              </p>
              <p className="text-xs text-slate-400">
                Required nodes: {
                  result.requiredNodes
                    .map(id =>
                      nodes.find(node => node.id === id)?.name
                    )
                    .join(", ") || "None"
                }
              </p>
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-800 text-slate-300">
                <tr>
                  <th className="p-3 text-left">Plan</th>
                  <th className="p-3 text-left">Upgrade</th>
                  <th className="p-3 text-right">Level</th>
                  <th className="p-3 text-right">Cost</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Remaining Skein</th>
                  <th className="p-3 text-right">Time to Afford</th>
                  <th className="p-3 text-left">Objective</th>
                </tr>
              </thead>

              <tbody>
                {nodes.map(node => (
                  <tr
                    key={node.id}
                    className="border-t border-slate-800"
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selected.has(node.id)}
                        onChange={event =>
                          toggleNode(node.id, event.target.checked)
                        }
                        aria-label={`Plan ${node.name}`}
                      />
                    </td>

                    <td className="p-3">{node.name}</td>

                    <td className="p-3 text-right">
                      {node.level}/{node.maxLevel}
                    </td>

                    <td className="p-3 text-right">
                      {node.cost}
                    </td>

                    <td className="p-3 text-center">
                    {nodeResults.get(node.id)?.status === "locked"
                        ? "🔒"
                        : nodeResults.get(node.id)?.status === "planned"
                        ? "🔓"
                        : nodeResults.get(node.id)?.status === "maxed"
                            ? "Maxed"
                            : "✓"}
                    </td>

                    <td className="p-3 text-right">
                     {nodeResults.get(node.id)?.remainingSkein ?? "—"}
                    </td>

                    <td className="p-3 text-right whitespace-nowrap">
                      {nodeTimes.get(node.id) ?? "—"}
                    </td>

                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => setTargetId(node.id)}
                        className={
                          targetId === node.id
                            ? "text-cyan-300 font-semibold"
                            : "text-slate-400 hover:text-white"
                        }
                      >
                        {targetId === node.id
                          ? "Selected"
                          : "Calculate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          
        </>
      )}
    </div>
  );
}
