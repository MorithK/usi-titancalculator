
export type USISaveRecord = Record<string, unknown>;

export interface USIDecodedSave {
  version: string;
  compatibilityVersion: number;
  timestamp: number | null;
  recordCount: number;
  records: USISaveRecord[];
  data: Record<string, USISaveRecord>;
  rawJson: string;
}
