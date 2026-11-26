
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/utils/supabase";
import { loadWarpNodes } from "@/lib/warp/loadWarpData";
import { calculateWarpObjective, type WarpNode } from "@/lib/warp/warpPlanner";
import { calculateWarpTime, formatWarpDuration } from "@/lib/warp/warpTiming";
import Decimal from "decimal.js";
import { calculateCombinedWarpPlan } from "@/lib/warp/warpCombinedPlanner";

type WarpInfo = {
  warp_id: number;
  warp_name: string;
};

type Props = {
  userId: string;
  revision: number;
};

function formatSkein(value: string | number): string {
    return new Decimal(value).toFixed(2);
  }

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

  const combinedPlan = useMemo(() => {
    return calculateCombinedWarpPlan(
      nodes,
      selected,
      skein
    );
  }, [nodes, selected, skein]);

  const combinedTime = useMemo(() => {
    if (
      combinedPlan.status !== "ready" ||
      selected.size === 0 ||
      warpId !== tetheredWarpId ||
      combinedPlan.remainingSkein === null
    ) {
      return null;
    }
  
    const charge = Number(chargeSeconds);
    const discharge = Number(dischargeSeconds);
    const remaining = Number(remainingDischarge);
  
    if (
      [chargeSeconds, dischargeSeconds, remainingDischarge,
        skeinPerCharge].some(value => value.trim() === "") ||
      ![charge, discharge, remaining].every(Number.isFinite) ||
      charge < 0 ||
      discharge < 0 ||
      remaining < 0 ||
      remaining > discharge ||
      charge + discharge <= 0
    ) {
      return null;
    }
  
    try {
      const seconds = calculateWarpTime({
        remainingSkein: combinedPlan.remainingSkein,
        skeinPerCharge,
        chargeSeconds: charge,
        dischargeSeconds: discharge,
        remainingDischargeSeconds: remaining,
      });
  
      return seconds === 0
        ? "Available"
        : formatWarpDuration(seconds);
    } catch {
      return null;
    }
  }, [
    combinedPlan,
    selected,
    warpId,
    tetheredWarpId,
    chargeSeconds,
    dischargeSeconds,
    remainingDischarge,
    skeinPerCharge,
  ]);

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
                {formatSkein(skein)}
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
        <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-5 space-y-5">
            <div className="space-y-1">
            <h3 className="text-lg font-semibold text-white">
                {nodes.find(node => node.id === targetId)?.name}
                <span className="ml-2 text-sm font-normal text-slate-400">
                • Next Level
                </span>
            </h3>

            <p className="text-sm text-slate-400">
                Objective Purchase Breakdown
            </p>
            </div>

            {result.status === "locked" ? (
            <p className="text-amber-400 text-sm">
                🔒 Select the objective and its missing prerequisites
                to calculate the full purchase cost.
            </p>
            ) : result.status === "maxed" ? (
            <p className="text-emerald-400 text-sm">
                This upgrade is already at its maximum level.
            </p>
            ) : (
            <>
                <div className="space-y-4">
                {result.requiredNodes.map((id, index) => {
                    const node = nodes.find(item => item.id === id);
                    if (!node) return null;

                    const isObjective = id === targetId;

                    return (
                    <div
                        key={id}
                        className="flex items-start justify-between gap-4"
                    >
                        <div className="flex items-start gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-600 text-xs text-slate-300">
                            {index + 1}
                        </div>

                        <div>
                            <p className="font-medium text-white">
                            {node.name}
                            <span className="ml-2 text-xs text-slate-400">
                                Level {node.level + 1}
                            </span>
                            </p>

                            <p className="text-xs text-slate-400">
                            {isObjective
                                ? "Objective"
                                : "Prerequisite"}
                            </p>
                        </div>
                        </div>

                        <span className="whitespace-nowrap font-medium tabular-nums text-white">
                        {formatSkein(node.cost)} Skein
                        </span>
                    </div>
                    );
                })}
                </div>

                <div className="border-t border-slate-700 pt-4 space-y-3">
                <div className="flex justify-between gap-4 text-sm">
                    <span className="text-slate-400">
                    Total Required
                    </span>

                    <span className="font-medium tabular-nums">
                    {formatSkein(result.totalCost ?? "0")} Skein
                    </span>
                </div>

                <div className="flex justify-between gap-4 text-sm">
                    <span className="text-slate-400">
                    Current Balance
                    </span>

                    <span className="tabular-nums">
                    {formatSkein(skein)} Skein
                    </span>
                </div>

                <div className="border-t border-slate-700 pt-4 flex items-center justify-between gap-4">
                    <span className="font-semibold text-white">
                    Still Needed
                    </span>

                    <span className="text-2xl font-bold tabular-nums text-cyan-300">
                    {formatSkein(result.remainingSkein ?? "0")}
                    <span className="ml-2 text-sm font-normal">
                        Skein
                    </span>
                    </span>
                </div>
                </div>
            </>
            )}
        </div>
        )}


        {selected.size > 0 && (
        <div className="rounded-xl border border-cyan-800 bg-slate-900/40 p-5 space-y-5">
            <div>
            <h3 className="text-lg font-semibold text-white">
                Combined Purchase Plan
            </h3>
            <p className="text-sm text-slate-400">
                Total cost of all selected upgrades, with shared
                prerequisites counted only once.
            </p>
            </div>

        {combinedPlan.status === "blocked" ? (
        <div className="space-y-2">
            <p className="text-sm text-amber-400">
            🔒 Some selected upgrades have missing prerequisites.
            </p>

            {combinedPlan.blockedNodes.map(id => {
            const node = nodes.find(item => item.id === id);

            return (
                <p key={id} className="text-sm text-slate-300">
                {node?.name ?? `Node ${id}`}
                </p>
            );
            })}

            <p className="text-xs text-slate-400">
            Select all missing prerequisites to calculate
            the complete purchase plan.
            </p>
        </div>
        ) : (
        <>
            <div className="space-y-4">
            {combinedPlan.requiredNodes.map((id, index) => {
                const node = nodes.find(item => item.id === id);
                if (!node) return null;

                return (
                <div
                    key={id}
                    className="flex items-start justify-between gap-4"
                >
                    <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-600 text-xs text-slate-300">
                        {index + 1}
                    </div>

                    <div>
                        <p className="font-medium text-white">
                        {node.name}
                        <span className="ml-2 text-xs text-slate-400">
                            Level {node.level + 1}
                        </span>
                        </p>

                        <p className="text-xs text-slate-400">
                        {selected.has(id)
                            ? "Selected upgrade"
                            : "Required prerequisite"}
                        </p>
                    </div>
                    </div>

                    <span className="whitespace-nowrap font-medium tabular-nums text-white">
                    {formatSkein(node.cost)} Skein
                    </span>
                </div>
                );
            })}

            {combinedPlan.requiredNodes.length === 0 && (
                <p className="text-sm text-slate-400">
                No additional purchases required.
                </p>
            )}
            </div>

            <div className="border-t border-slate-700 pt-4 space-y-3">
            <div className="flex justify-between gap-4 text-sm">
                <span className="text-slate-400">
                Total Required
                </span>
                <span className="font-medium tabular-nums">
                {formatSkein(combinedPlan.totalCost ?? "0")} Skein
                </span>
            </div>

            <div className="flex justify-between gap-4 text-sm">
                <span className="text-slate-400">
                Current Balance
                </span>
                <span className="tabular-nums">
                {formatSkein(skein)} Skein
                </span>
            </div>

            <div className="border-t border-slate-700 pt-4 flex items-center justify-between gap-4">
                <span className="font-semibold text-white">
                Still Needed
                </span>
                <span className="text-2xl font-bold tabular-nums text-cyan-300">
                {formatSkein(combinedPlan.remainingSkein ?? "0")}
                <span className="ml-2 text-sm font-normal">
                    Skein
                </span>
                </span>
            </div>

            <div className="flex justify-between gap-4 text-sm">
                <span className="text-slate-400">
                Total Time to Afford
                </span>
                <span className="font-semibold tabular-nums text-white">
                {combinedTime ??
                    (warpId !== tetheredWarpId
                    ? "Not tethered"
                    : "Unavailable")}
                </span>
            </div>
            </div>
        </>
        )}
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
                        {formatSkein(node.cost)}
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
                        {nodeResults.get(node.id)?.remainingSkein != null
                        ? formatSkein(nodeResults.get(node.id)!.remainingSkein!)
                        : "—"}
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
