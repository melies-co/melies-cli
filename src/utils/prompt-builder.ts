import presets from '../data/variation-presets.json';

type PresetCategory = keyof typeof presets;

export interface StyleOptions {
  camera?: string;
  shot?: string;
  expression?: string;
  lighting?: string;
  time?: string;
  weather?: string;
  colorGrade?: string;
  mood?: string;
  artStyle?: string;
  era?: string;
}

const FLAG_TO_CATEGORY: Record<keyof StyleOptions, PresetCategory> = {
  camera: 'camera',
  shot: 'shot',
  expression: 'expression',
  lighting: 'lighting',
  time: 'time',
  weather: 'weather',
  colorGrade: 'color-grade',
  mood: 'mood',
  artStyle: 'art-style',
  era: 'era',
};

export function lookupModifier(category: PresetCategory, value: string): string | null {
  const categoryPresets = (presets as Record<string, Record<string, { label: string; modifier: string }>>)[category];
  if (!categoryPresets) return null;

  // Try exact match first
  if (categoryPresets[value]) return categoryPresets[value].modifier;

  // Try case-insensitive match on key or label
  const lower = value.toLowerCase();
  for (const [key, preset] of Object.entries(categoryPresets)) {
    if (key.toLowerCase() === lower || preset.label.toLowerCase() === lower) {
      return preset.modifier;
    }
  }

  return null;
}

export function listPresets(category: PresetCategory): Array<{ key: string; label: string }> {
  const categoryPresets = (presets as Record<string, Record<string, { label: string; modifier: string }>>)[category];
  if (!categoryPresets) return [];
  return Object.entries(categoryPresets).map(([key, val]) => ({
    key,
    label: val.label,
  }));
}

export function buildPrompt(base: string, options: StyleOptions, actorModifier?: string): string {
  let prompt = base;

  // Prepend actor modifier if provided
  if (actorModifier) {
    prompt = `${actorModifier}, ${prompt}`;
  }

  // Append style modifiers
  const modifiers: string[] = [];
  for (const [flag, category] of Object.entries(FLAG_TO_CATEGORY)) {
    const value = options[flag as keyof StyleOptions];
    if (value) {
      const modifier = lookupModifier(category, value);
      if (modifier) {
        modifiers.push(modifier);
      } else {
        // If not found in presets, use the raw value as modifier
        modifiers.push(value);
      }
    }
  }

  if (modifiers.length > 0) {
    prompt = `${prompt}, ${modifiers.join(', ')}`;
  }

  return prompt;
}
