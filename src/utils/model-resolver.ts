import { MeliesAPI } from '../api';

export type QualityPreset = 'fast' | 'quality' | 'best';
export type GenerationType = 'image' | 'video';

// Preset model IDs: which model to use for each quality level.
// These are CLI-side decisions (not API data).
const IMAGE_PRESETS: Record<QualityPreset, string> = {
  fast: 'flux-schnell',
  quality: 'flux-pro',
  best: 'seedream-3',
};

const VIDEO_PRESETS: Record<QualityPreset, string> = {
  fast: 'kling-v2',
  quality: 'kling-v3-pro',
  best: 'veo-3.1',
};

const PRESETS: Record<GenerationType, Record<QualityPreset, string>> = {
  image: IMAGE_PRESETS,
  video: VIDEO_PRESETS,
};

export function resolveModel(
  type: GenerationType,
  options: { model?: string; fast?: boolean; quality?: boolean; best?: boolean }
): string {
  if (options.model) return options.model;
  if (options.best) return PRESETS[type].best;
  if (options.quality) return PRESETS[type].quality;
  return PRESETS[type].fast;
}

// Credit costs are fetched from the API (single source of truth).
// Cached per session to avoid repeated calls.
let creditCache: Map<string, number> | null = null;

async function loadCreditCache(): Promise<Map<string, number>> {
  if (creditCache) return creditCache;
  try {
    const api = new MeliesAPI();
    const { models } = await api.getModels();
    creditCache = new Map();
    for (const m of models) {
      const id = m.id || (m as any).model;
      if (id && m.credits != null) {
        creditCache.set(id, m.credits);
      }
    }
    return creditCache;
  } catch {
    creditCache = new Map();
    return creditCache;
  }
}

export async function getModelCredits(modelId: string): Promise<number | null> {
  const cache = await loadCreditCache();
  return cache.get(modelId) ?? null;
}
