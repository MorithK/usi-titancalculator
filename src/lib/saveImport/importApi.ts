
import { supabase } from "@/utils/supabase";
import type { MappedResource } from "./resourceMapping";
import type {
  ImportedProgression
} from "./extractors/progression";

export interface SnapshotImportResult {
  success: boolean;
  resources_imported: number;
  regions_imported: number;
  highest_sector: number;
  region_id: number;
  imported_at: string;
}

export type ApplyResourceImport = (
  resources: MappedResource[],
  progression: ImportedProgression
) => Promise<SnapshotImportResult>;

export async function importPlayerSnapshot(
  resources: MappedResource[],
  progression: ImportedProgression
): Promise<SnapshotImportResult> {
  if (resources.length === 0) {
    throw new Error("No mapped resources to import.");
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
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  if (
    !data?.success ||
    data.regions_imported !== 4
  ) {
    throw new Error("Game save import failed.");
  }

  return data as SnapshotImportResult;
}
