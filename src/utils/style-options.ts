import type { Argv } from 'yargs';

/**
 * Add visual style flags to any generation command.
 * Used by image, video, poster, thumbnail, pipeline.
 */
export function addStyleOptions<T>(yargs: Argv<T>): Argv<T & {
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
}> {
  return yargs
    .option('camera', { type: 'string', description: 'Camera angle (eye-level, high, low, overhead, dutch, ots, profile, three-quarter)' })
    .option('shot', { type: 'string', description: 'Shot size (ecu, close-up, medium, cowboy, full-body, wide, tighter, wider)' })
    .option('expression', { type: 'string', description: 'Expression (smile, laugh, serious, surprised, villain-smirk, seductive, horrified)' })
    .option('lighting', { type: 'string', description: 'Lighting (soft, golden, noir, rembrandt, backlit, neon, candle, hard)' })
    .option('time', { type: 'string', description: 'Time of day (dawn, sunrise, golden, dusk, night, morning, midday)' })
    .option('weather', { type: 'string', description: 'Weather (clear, fog, rain, storm, snow, overcast, mist)' })
    .option('colorGrade', { alias: 'color-grade', type: 'string', description: 'Color grade (natural, teal-orange, mono, warm, cool, filmic, sepia)' })
    .option('mood', { type: 'string', description: 'Mood (romantic, mysterious, tense, ethereal, gritty, epic, nostalgic)' })
    .option('artStyle', { alias: 'art-style', type: 'string', description: 'Art style (film-still, blockbuster, noir, anime, ghibli, oil, watercolor, concept)' })
    .option('era', { type: 'string', description: 'Era (victorian, 1920s, 1980s, modern, dystopian, medieval)' }) as any;
}

/**
 * Add quality preset flags (--fast, --quality, --best) to a command.
 */
export function addQualityOptions<T>(yargs: Argv<T>): Argv<T & {
  fast?: boolean;
  quality?: boolean;
  best?: boolean;
}> {
  return yargs
    .option('fast', { type: 'boolean', description: 'Use the fastest model (default)' })
    .option('quality', { type: 'boolean', description: 'Use a higher quality model' })
    .option('best', { type: 'boolean', description: 'Use the best available model' }) as any;
}

/**
 * Add actor flag to a command.
 */
export function addActorOption<T>(yargs: Argv<T>): Argv<T & { actor?: string }> {
  return yargs
    .option('actor', { type: 'string', description: 'Built-in AI actor name (run "melies actors" to browse)' }) as any;
}

/**
 * Add common generation options (--dry-run, --seed, --output).
 */
export function addGenerationOptions<T>(yargs: Argv<T>): Argv<T & {
  dryRun?: boolean;
  seed?: number;
  output?: string;
}> {
  return yargs
    .option('dryRun', { alias: 'dry-run', type: 'boolean', description: 'Show what would happen without generating' })
    .option('seed', { type: 'number', description: 'Seed for reproducible generation' })
    .option('output', { alias: 'o', type: 'string', description: 'Output file path (use with --sync)' }) as any;
}
