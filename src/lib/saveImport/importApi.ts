
import { supabase } from "@/utils/supabase";
import type { MappedResource } from "./resourceMapping";

export interface ResourceImportResult {
  success: boolean;
  resources_imported: number;
  imported_at: string;
}

export type ApplyResourceImport = (
  resources: MappedResource[]
) => Promise<ResourceImportResult>;

export async function importPlayerResources(
  resources: MappedResource[]
): Promise<ResourceImportResult> {

  if (resources.length === 0) {
    throw new Error("No mapped resources to import.");
  }

  const payload = resources.map(resource => ({
    game_resource_key: resource.gameResourceKey,
    resource_amt: resource.amount,
    resource_gain_rate: resource.perSecond
  }));

  const { data, error } = await supabase.rpc(
    "import_player_resources",
    {
      p_resources: payload
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.success) {
    throw new Error("Resource import failed.");
  }

  return data as ResourceImportResult;
}
