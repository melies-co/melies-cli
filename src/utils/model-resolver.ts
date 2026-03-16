export type QualityPreset = 'fast' | 'quality' | 'best';
export type GenerationType = 'image' | 'video';

interface ModelConfig {
  id: string;
  credits: number;
}

const IMAGE_PRESETS: Record<QualityPreset, ModelConfig> = {
  fast: { id: 'flux-schnell', credits: 2 },
  quality: { id: 'flux-pro', credits: 8 },
  best: { id: 'seedream-3', credits: 6 },
};

const VIDEO_PRESETS: Record<QualityPreset, ModelConfig> = {
  fast: { id: 'kling-v2', credits: 30 },
  quality: { id: 'kling-v3-pro', credits: 100 },
  best: { id: 'veo-3.1', credits: 400 },
};

const PRESETS: Record<GenerationType, Record<QualityPreset, ModelConfig>> = {
  image: IMAGE_PRESETS,
  video: VIDEO_PRESETS,
};

export function resolveModel(
  type: GenerationType,
  options: { model?: string; fast?: boolean; quality?: boolean; best?: boolean }
): string {
  // Explicit model always wins
  if (options.model) return options.model;

  // Quality preset
  if (options.best) return PRESETS[type].best.id;
  if (options.quality) return PRESETS[type].quality.id;

  // Default is fast
  return PRESETS[type].fast.id;
}

export function getPresetCredits(
  type: GenerationType,
  options: { model?: string; fast?: boolean; quality?: boolean; best?: boolean }
): number | null {
  if (options.model) return null; // Unknown for custom models
  if (options.best) return PRESETS[type].best.credits;
  if (options.quality) return PRESETS[type].quality.credits;
  return PRESETS[type].fast.credits;
}
