
import { supabase } from "@/utils/supabase";
import type { MappedResource } from "./resourceMapping";
import type { ImportedProgression } from "./extractors/progression";
import type { ImportedTitanComponent } from "./extractors/titanComponents";

export interface SnapshotImportResult {
  success: boolean;
  resources_imported: number;
  regions_imported: number;
  titan_components_imported: number;
  highest_sector: number;
  region_id: number;
  imported_at: string;
}

export type ApplyResourceImport = (
  resources: MappedResource[],
  progression: ImportedProgression,
  titanComponents: ImportedTitanComponent[]
) => Promise<SnapshotImportResult>;

export async function importPlayerSnapshot(
  resources: MappedResource[],
  progression: ImportedProgression,
  titanComponents: ImportedTitanComponent[]
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
      p_titan_components: titanComponents.map(item => ({
        slotNumber: item.slotNumber,
        coreUpgradeId: item.coreUpgradeId,
        level: item.level,
      })),
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  if (
    !data?.success ||
    data.regions_imported !== 4 ||
    data.titan_components_imported !== 7
  ) {
    throw new Error("Game save import failed.");
  }

  return data as SnapshotImportResult;
}
