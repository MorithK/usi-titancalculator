
import { supabase } from "@/utils/supabase";
import type { MappedResource } from "./resourceMapping";
import type { ImportedProgression } from "./extractors/progression";
import type { ImportedTitanComponent } from "./extractors/titanComponents";
import type { ImportedWarps } from "./extractors/warps";
import type { ImportedCrewUpgrade } from "./extractors/crewUpgrades";

export interface SnapshotImportResult {
  success: boolean;
  resources_imported: number;
  regions_imported: number;
  titan_components_imported: number;
  highest_sector: number;
  region_id: number;
  imported_at: string;
  warps_imported: number;
  warp_nodes_imported: number;
  crew_upgrades_imported: number;
}

export type ApplyResourceImport = (
  resources: MappedResource[],
  progression: ImportedProgression,
  titanComponents: ImportedTitanComponent[],
  warps: ImportedWarps,
  crewUpgrades: ImportedCrewUpgrade[]
) => Promise<SnapshotImportResult>;

export async function importPlayerSnapshot(
  resources: MappedResource[],
  progression: ImportedProgression,
  titanComponents: ImportedTitanComponent[],
  warps: ImportedWarps,
  crewUpgrades: ImportedCrewUpgrade[]
): Promise<SnapshotImportResult> {
  if (resources.length === 0) {
    throw new Error("No mapped resources to import.");
  }
  if (titanComponents.length !== 7) {
    throw new Error(
      "The game save must contain seven Titan components."
    );
  }

  const payload = resources.map(resource => ({
    game_resource_key: resource.gameResourceKey,
    resource_amt: resource.amount,
    resource_gain_rate: resource.perSecond,
  }));

  const progressionPayload = {
    currentRegionId: progression.currentRegionId,
    currentSector: progression.currentSector,
    currentSectorId: progression.currentSectorId,
    nextUmbraSector: progression.nextUmbraSector,
    regions: progression.regions.map(region => ({
      regionId: region.regionId,
      historicalHighest: region.historicalHighest,
      currentRunHighest: region.currentRunHighest,
      clearedSectorIds: region.clearedSectorIds,
    })),
  };

  const { data, error } = await supabase.rpc(
    "import_player_snapshot",
    {
      p_resources: payload,
      p_progression: progressionPayload,
      p_warps: warps,
      p_titan_components: titanComponents.map(item => ({
        slotNumber: item.slotNumber,
        coreUpgradeId: item.coreUpgradeId,
        level: item.level,
      })),
      p_crew_upgrades: crewUpgrades.map(item => ({
        crewUpgradeId: item.crewUpgradeId,
        saveName: item.saveName,
        level: item.level,
      })),
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  if (
    !data?.success ||
    data.regions_imported !== progression.regions.length ||
    data.titan_components_imported !== titanComponents.length ||
    data.crew_upgrades_imported !== crewUpgrades.length ||
    data.warps_imported !== warps.warps.length ||
    data.warp_nodes_imported !== warps.nodes.length ||
    data.resources_imported !== resources.length
  ) {
    throw new Error(
      "Game save import returned incomplete results."
    );
  }

  return data as SnapshotImportResult;
}
