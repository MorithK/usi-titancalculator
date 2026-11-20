
import { supabase } from "@/utils/supabase";
import type { ImportedResource } from "./extractors/resources";

export interface MappedResource extends ImportedResource {
  resourceTypeId: number;
  resourceName: string;
  resourceType: string;
  currentAmount: string | null;
  currentGainRate: string | null;
}

export interface ResourceMappingResult {
  mapped: MappedResource[];
  unmapped: ImportedResource[];
  missing: string[];
}

export async function mapResources(
  resources: ImportedResource[]
): Promise<ResourceMappingResult> {

  // Retrieve the authenticated player
  const { data: auth, error: authError } =
    await supabase.auth.getUser();

  if (authError || !auth.user) {
    throw new Error("Player is not authenticated.");
  }

  // Retrieve the resource definitions and player balances
  const [lookupResult, playerResult] = await Promise.all([
    supabase
      .from("resource_types")
      .select(`
        resource_type_id,
        resource_name,
        resource_type,
        game_resource_key
      `)
      .not("game_resource_key", "is", null),

    supabase
      .from("player_resources")
      .select(`
        resource_type_id,
        resource_amt::text,
        resource_gain_rate::text
      `)
      .eq("user_id", auth.user.id)
  ]);

  if (lookupResult.error) {
    throw new Error(lookupResult.error.message);
  }

  if (playerResult.error) {
    throw new Error(playerResult.error.message);
  }

  const lookup = new Map(
    lookupResult.data.map(row => [
      row.game_resource_key,
      row
    ])
  );

  const current = new Map(
    playerResult.data.map(row => [
      row.resource_type_id,
      row
    ])
  );

  const mapped: MappedResource[] = [];
  const unmapped: ImportedResource[] = [];

  // Match imported resources to database definitions
  for (const resource of resources) {
    const definition = lookup.get(
      resource.gameResourceKey
    );

    if (!definition) {
      unmapped.push(resource);
      continue;
    }

    const existing = current.get(
      definition.resource_type_id
    );

    mapped.push({
      ...resource,
      resourceTypeId: definition.resource_type_id,
      resourceName: definition.resource_name,
      resourceType: definition.resource_type,
      currentAmount: existing?.resource_amt ?? null,
      currentGainRate:
        existing?.resource_gain_rate ?? null
    });
  }

  // Identify supported resources absent from the save
  const importedKeys = new Set(
    resources.map(resource => resource.gameResourceKey)
  );

  const missing = lookupResult.data
    .filter(row => !importedKeys.has(row.game_resource_key))
    .map(row => row.game_resource_key as string);

  mapped.sort(
    (a, b) => a.resourceTypeId - b.resourceTypeId
  );

  return {
    mapped,
    unmapped,
    missing
  };
}
