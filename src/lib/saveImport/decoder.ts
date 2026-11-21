
import { parse } from "lossless-json";
import type {
  USIDecodedSave,
  USISaveRecord,
} from "./types";

export async function decodeUSISave(
  exportString: string
): Promise<USIDecodedSave> {
  // 1. Clean and decode Base64
  const cleaned = exportString.replace(/\s/g, "");

  if (!cleaned) {
    throw new Error("The exported save string is empty.");
  }

  let bytes: Uint8Array<ArrayBuffer>;

  try {
    const binary = atob(cleaned);

    bytes = Uint8Array.from(
      binary,
      (char) => char.charCodeAt(0)
    );
  } catch {
    throw new Error("Invalid Base64 save data.");
  }

  // 2. Verify GZip signature
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) {
    throw new Error("Save data is not in GZip format.");
  }

  // 3. Decompress
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));

  const buffer = await new Response(stream).arrayBuffer();

  // 4. Remove the binary header
  if (buffer.byteLength <= 8) {
    throw new Error("Invalid save file header.");
  }

  // 5. Decode text and remove trailing null characters
  const rawJson = new TextDecoder("utf-8", {
    fatal: true,
  })
    .decode(buffer.slice(8))
    .replace(/\0+$/, "")
    .trim();

  // 6. Parse newline-delimited JSON
  const records: USISaveRecord[] = rawJson
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line, index) => {
      try {
        const record = parse(line);

        if (
          typeof record !== "object" ||
          record === null ||
          Array.isArray(record)
        ) {
          throw new Error("Expected a JSON object.");
        }

        return record as USISaveRecord;
      } catch {
        throw new Error(
          `Invalid JSON at save record ${index + 1}.`
        );
      }
    });

  // 7. Extract metadata
  const version = records[0]?.version;
  const compatibilityVersion = Number(
    records[1]?.compatibility_version
  );

  if (
    typeof version !== "string" ||
    !Number.isSafeInteger(compatibilityVersion)
  ) {
    throw new Error("Invalid save metadata.");
  }

  const timestampRecord = records.find(
    (record) => "timestamp" in record
  );

  const timestamp = timestampRecord
    ? Number(timestampRecord.timestamp)
    : null;

  // 8. Index records by their game identifier
  const data: Record<string, USISaveRecord> =
    Object.create(null);

  for (const record of records) {
    if (typeof record.save_name === "string") {
      if (Object.hasOwn(data, record.save_name)) {
        throw new Error(
          `Duplicate save record: ${record.save_name}`
        );
      }

      data[record.save_name] = record;
    }
  }

  // 9. Verify essential game records
  if (!data.PlayerInfo || !data.BattleArea) {
    throw new Error("Required player records are missing.");
  }

  return {
    version,
    compatibilityVersion,
    timestamp,
    recordCount: records.length,
    records,
    data,
    rawJson,
  };
}
