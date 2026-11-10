export type TabId = "core" | "warp" | "synth" | "crew" | "notes";

export interface TabItem {
  id: TabId;
  label: string;
  badge?: string | number; // Optional badge for alerts/notifications
  description?: string;
}