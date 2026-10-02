export interface IntakeMetrics {
  ocrImages: number;
  cachedImages: number;
  newImages: number;
  textCached: boolean;
  textCalls: number;
  visionCalls: number;
  totalTextCalls: number;
  totalVisionCalls: number;
  aiAssisted: boolean;
  provider: string | null;
  model: string | null;
  escalationReason: string | null;
  estimatedCostUsd: number | null;
}
