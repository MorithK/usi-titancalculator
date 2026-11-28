
import { supabase } from "@/utils/supabase";

import type {
  ImportedResource
} from "./extractors/resources";

/**
 * Represents a game resource definition stored in
 * the public resource_types reference table.
 *
 * These definitions identify resources; they do not
 * contain any player's balance or production rate.
 */
export interface ResourceDefinition {

  /** Unique calculator/database resource identifier. */
  resource_type_id: number;

  /** Human-readable resource name. */
  resource_name: string;

  /** Resource category used by the calculator. */
  resource_type: string;

  /** Corresponding key in the game's exported save. */
  game_resource_key: string | null;
}

/**
 * Represents an existing resource balance loaded from
 * an authenticated player's Supabase account.
 *
 * Amounts and rates remain strings to preserve
 * precision for extremely large game values.
 */
export interface PlayerResourceBalance {

  /** Resource identifier linking to resource_types. */
  resource_type_id: number;

  /** Previously saved resource amount. */
  resource_amt: string;

  /** Previously saved production rate. */
  resource_gain_rate: string | null;
}

/**
 * A game-save resource successfully matched to
 * one of the calculator's supported definitions.
 *
 * Existing account values are optional comparison data.
 * They are null when mapping resources for a guest.
 */
export interface MappedResource extends ImportedResource {
  resourceTypeId: number;
  resourceName: string;
  resourceType: string;
  currentAmount: string | null;
  currentGainRate: string | null;
}

/**
 * Results of mapping imported resources against the
 * supported game resource definitions.
 */
export interface ResourceMappingResult {

  /** Imported resources recognised by the calculator. */
  mapped: MappedResource[];

  /** Save resources without matching definitions. */
  unmapped: ImportedResource[];

  /** Supported resource keys absent from the save. */
  missing: string[];
}

/**
 * Loads resource definitions shared by guest and
 * authenticated calculator sessions.
 *
 * Requires only read access to public.resource_types.
 *
 * This function never checks authentication or reads
 * player-specific resource balances.
 *
 * @throws If the Supabase query fails.
 * @throws If no usable definitions are returned.
 */
export async function loadPublicResourceDefinitions():
  Promise<ResourceDefinition[]> {

  // Retrieve reference definitions from Supabase.
  const { data, error } = await supabase
    .from("resource_types")
    .select(`
      resource_type_id,
      resource_name,
      resource_type,
      game_resource_key
    `)
    .not("game_resource_key", "is", null);

  // Stop if the database request failed.
  if (error) {
    throw new Error(error.message);
  }

  // Convert the returned rows to our definition type.
  const definitions =
    (data ?? []) as ResourceDefinition[];

  // An empty result is not a usable reference dataset.
  if (definitions.length === 0) {
    throw new Error(
      "Game resource definitions are missing."
    );
  }

  return definitions;
}

/**
 * Maps imported game resources using supplied reference
 * definitions and optional existing player balances.
 *
 * This function is pure:
 * - Does not request authentication.
 * - Does not call Supabase.
 * - Does not modify its input arrays.
 *
 * Guest imports omit existingBalances, so comparison
 * values are null rather than fabricated zeroes.
 *
 * @param resources Resources extracted from the game save.
 * @param definitions Supported resource definitions.
 * @param existingBalances Optional cloud-saved player data.
 *
 * @returns Mapped, unsupported and missing resources.
 */
export function mapImportedResources(
  resources: ImportedResource[],
  definitions: ResourceDefinition[],
  existingBalances: PlayerResourceBalance[] = []
): ResourceMappingResult {

  /*
   * Build a lookup from the game's resource key to
   * its corresponding calculator definition.
   *
   * Ignore definitions without a game save key.
   */
  const lookup = new Map(
    definitions
      .filter(
        (definition): definition is
          ResourceDefinition & {
            game_resource_key: string;
          } =>
          definition.game_resource_key !== null
      )
      .map(definition => [
        definition.game_resource_key,
        definition
      ] as const)
  );

  /*
   * Index existing balances by resource type ID.
   *
   * For guests this Map will be empty, because no
   * authenticated player state was provided.
   */
  const current = new Map(
    existingBalances.map(balance => [
      balance.resource_type_id,
      balance
    ] as const)
  );

  // Allocate the two categories of imported resources.
  const mapped: MappedResource[] = [];
  const unmapped: ImportedResource[] = [];

  // Process every resource found in the exported save.
  for (const resource of resources) {

    // Find its corresponding public game definition.
    const definition = lookup.get(
      resource.gameResourceKey
    );

    // Preserve unknown resources for diagnostics.
    if (!definition) {
      unmapped.push(resource);
      continue;
    }

    // Existing cloud balances are optional comparison data.
    const existing = current.get(
      definition.resource_type_id
    );

    // Combine the imported values with their definition.
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

  // Record all keys present in the imported game save.
  const importedKeys = new Set(
    resources.map(resource => resource.gameResourceKey)
  );

  /*
   * Identify known resources missing from the game save.
   *
   * Only resource definitions with valid game keys
   * are included.
   */
  const missing = [...lookup.keys()]
    .filter(key => !importedKeys.has(key));

  // Preserve the previous numeric resource ordering.
  mapped.sort(
    (a, b) => a.resourceTypeId - b.resourceTypeId
  );

  return {
    mapped,
    unmapped,
    missing
  };
}

/**
 * Maps imported resources for an authenticated player.
 *
 * This compatibility wrapper preserves the existing
 * mapResources() API used by SaveImportPanel.
 *
 * It retrieves public resource definitions and the
 * signed-in player's saved balances, then delegates
 * the actual mapping to mapImportedResources().
 *
 * Guest sessions should use loadPublicResourceDefinitions()
 * and mapImportedResources() directly instead.
 *
 * @throws If the player is not authenticated.
 * @throws If any database query fails.
 */
export async function mapResources(
  resources: ImportedResource[]
): Promise<ResourceMappingResult> {

  // Identify the currently authenticated player.
  const { data: auth, error: authError } =
    await supabase.auth.getUser();

  if (authError || !auth.user) {
    throw new Error("Player is not authenticated.");
  }

  // Load public definitions and private player balances.
  const [definitions, playerResult] = await Promise.all([

    loadPublicResourceDefinitions(),

    supabase
      .from("player_resources")
      .select(`
        resource_type_id,
        resource_amt::text,
        resource_gain_rate::text
      `)
      .eq("user_id", auth.user.id)
  ]);

  // Report private player-data retrieval failures.
  if (playerResult.error) {
    throw new Error(playerResult.error.message);
  }

  // Interpret the existing account balances.
  const existingBalances =
    (playerResult.data ?? []) as PlayerResourceBalance[];

  /*
   * Delegate the actual resource mapping.
   *
   * The same mapping algorithm now works with or
   * without authenticated player comparison values.
   */
  return mapImportedResources(
    resources,
    definitions,
    existingBalances
  );
}
