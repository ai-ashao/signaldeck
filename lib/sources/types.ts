import type { RawItem } from "@/lib/db/types";

export interface SourceConfig {
  id: string;
  source_type: string;
  name: string;
  config: Record<string, unknown>;
  enabled: boolean;
}

export interface SourceAdapter {
  id: string;
  fetch(config: SourceConfig): Promise<RawItem[]>;
}
