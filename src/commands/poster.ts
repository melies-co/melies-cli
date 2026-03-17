import type { CommandModule } from 'yargs';
import { MeliesAPI } from '../api';
import { getToken } from '../config';
import { pollAsset } from './image';
import { resolveModel, getPresetCredits } from '../utils/model-resolver';
import type { StyleOptions } from '../utils/prompt-builder';
import { findActor } from '../utils/actors';
import { downloadFile } from '../utils/download';
import { addStyleOptions, addQualityOptions, addActorOption, addGenerationOptions } from '../utils/style-options';
import posterStyles from '../data/poster-styles.json';

interface PosterArgs {
  title: string;
  logline?: string;
  genre?: string;
  style?: string;
  model?: string;
  aspectRatio?: string;
  ref?: string;
  actor?: string[];
  sync?: boolean;
  fast?: boolean;
  quality?: boolean;
  best?: boolean;
  dryRun?: boolean;
  seed?: number;
  output?: string;
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

export const posterCommand: CommandModule<{}, PosterArgs> = {
  command: 'poster <title>',
  describe: 'Generate a movie poster from a title, logline, and genre',
  builder: (yargs) => {
    let y = yargs
      .positional('title', {
        type: 'string',
        description: 'Movie or project title',
        demandOption: true,
      })
      .option('logline', {
        alias: 'l',
        type: 'string',
        description: 'Short synopsis or logline for the poster',
      })
      .option('genre', {
        alias: 'g',
        type: 'string',
        description: 'Genre (horror, sci-fi, comedy, drama, action, etc.)',
      })
      .option('style', {
        type: 'string',
        description: 'Poster style preset (cinematic, anime, noir, ghibli, etc.). Run with --dry-run to preview.',
      })
      .option('model', {
        alias: 'm',
        type: 'string',
        description: 'Image model to use (overrides quality presets)',
      })
      .option('aspectRatio', {
        alias: 'a',
        type: 'string',
        default: '3:4',
        description: 'Aspect ratio (3:4, 2:3, 1:1, 4:3)',
      })
      .option('actor', {
        type: 'string',
        array: true,
        description: 'AI actor name(s). Use multiple --actor flags for multiple actors.',
      })
      .option('ref', {
        type: 'string',
        description: 'Reference ID (actor/object) for consistent characters',
      })
      .option('sync', {
        alias: 's',
        type: 'boolean',
        default: false,
        description: 'Wait for generation to complete and return the URL',
      });
    y = addStyleOptions(y);
    y = addQualityOptions(y);
    y = addGenerationOptions(y);
    return y as any;
  },
  handler: async (argv) => {
    try {
      const model = resolveModel('image', { ...argv, model: argv.model || 'flux-dev' });

      // Resolve style preset
      let styleSuffix = '';
      if (argv.style) {
        const styleLower = argv.style.toLowerCase();
        const styles = posterStyles as Array<{ id: string; name: string; promptSuffix: string }>;
        const found = styles.find((s) =>
          s.id === styleLower ||
          s.name.toLowerCase() === styleLower ||
          s.id.includes(styleLower) ||
          s.name.toLowerCase().includes(styleLower)
        );
        if (found) {
          styleSuffix = found.promptSuffix;
        } else {
          console.error(JSON.stringify({
            error: `Style "${argv.style}" not found. Available: ${styles.map((s) => s.id).join(', ')}`,
          }));
          process.exit(1);
        }
      }

      // Resolve actors (supports multiple, text-only for posters)
      const actorModifiers: string[] = [];
      const actors = argv.actor || [];
      for (const actorName of actors) {
        const actor = findActor(actorName);
        if (!actor) {
          console.error(JSON.stringify({ error: `Actor "${actorName}" not found. Run "melies actors" to see available actors.` }));
          process.exit(1);
        }
        actorModifiers.push(actor.modifier);
      }

      // Collect style options (resolved server-side)
      const styleOptions: StyleOptions = {};
      if (argv.camera) styleOptions.camera = argv.camera;
      if (argv.shot) styleOptions.shot = argv.shot;
      if (argv.expression) styleOptions.expression = argv.expression;
      if (argv.lighting) styleOptions.lighting = argv.lighting;
      if (argv.time) styleOptions.time = argv.time;
      if (argv.weather) styleOptions.weather = argv.weather;
      if (argv.colorGrade) styleOptions.colorGrade = argv.colorGrade;
      if (argv.mood) styleOptions.mood = argv.mood;
      if (argv.artStyle) styleOptions.artStyle = argv.artStyle;
      if (argv.era) styleOptions.era = argv.era;

      let rawPrompt = `Movie poster for "${argv.title}"`;
      if (argv.logline) rawPrompt += `. ${argv.logline}`;
      if (argv.genre) rawPrompt += `. Genre: ${argv.genre}`;
      if (actorModifiers.length > 0) rawPrompt += `. Starring: ${actorModifiers.join(' and ')}`;
      if (styleSuffix) rawPrompt += `. ${styleSuffix}`;
      const hasStyleOptions = Object.keys(styleOptions).length > 0;

      // Dry run
      if (argv.dryRun) {
        const credits = getPresetCredits('image', { ...argv, model: argv.model || 'flux-dev' });
        console.log(JSON.stringify({
          model,
          prompt: rawPrompt,
          styleOptions: hasStyleOptions ? styleOptions : undefined,
          credits: credits || 'varies by model',
          aspectRatio: argv.aspectRatio,
          style: argv.style || null,
          actors: actors.length > 0 ? actors : null,
          seed: argv.seed || null,
        }, null, 2));
        return;
      }

      const token = getToken();
      const api = new MeliesAPI(token);

      const params: Record<string, unknown> = {
        prompt: rawPrompt,
        model,
        aspectRatio: argv.aspectRatio,
      };
      if (hasStyleOptions) params.styleOptions = styleOptions;
      if (argv.ref) params.refs = [argv.ref];
      if (argv.seed) params.seed = argv.seed;

      const result = await api.executeTool('poster_generator', params);

      if (argv.sync) {
        const asset = await pollAsset(api, result.assetId as string);
        if (asset.url && argv.output) {
          const filePath = await downloadFile(asset.url, argv.output);
          asset.savedTo = filePath;
        }
        console.log(JSON.stringify(asset, null, 2));
      } else {
        console.log(JSON.stringify({
          assetId: result.assetId,
          status: 'pending',
          message: 'Poster generation started. Use "melies status <assetId>" to check progress.',
        }, null, 2));
      }
    } catch (error: any) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  },
};
