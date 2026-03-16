import type { CommandModule } from 'yargs';
import { MeliesAPI } from '../api';
import { getToken } from '../config';
import { pollAsset } from './image';
import { resolveModel, getPresetCredits } from '../utils/model-resolver';
import { findActor } from '../utils/actors';
import { downloadFile } from '../utils/download';
import { addQualityOptions, addActorOption, addGenerationOptions } from '../utils/style-options';
import posterStyles from '../data/poster-styles.json';

interface PosterArgs {
  title: string;
  logline?: string;
  genre?: string;
  style?: string;
  model?: string;
  ref?: string;
  actor?: string;
  sync?: boolean;
  fast?: boolean;
  quality?: boolean;
  best?: boolean;
  dryRun?: boolean;
  seed?: number;
  output?: string;
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
    y = addQualityOptions(y);
    y = addActorOption(y);
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
        // Match by id, name, or partial id match
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

      // Resolve actor
      let actorModifier: string | undefined;
      let actorRef: string | undefined;
      if (argv.actor) {
        const actor = findActor(argv.actor);
        if (!actor) {
          console.error(JSON.stringify({ error: `Actor "${argv.actor}" not found. Run "melies actors" to see available actors.` }));
          process.exit(1);
        }
        actorModifier = actor.modifier;
        actorRef = actor.r2Url;
      }

      // Build poster prompt
      let prompt = `Movie poster for "${argv.title}"`;
      if (argv.logline) prompt += `. ${argv.logline}`;
      if (argv.genre) prompt += `. Genre: ${argv.genre}`;
      if (actorModifier) prompt += `. Starring: ${actorModifier}`;
      if (styleSuffix) prompt += `. ${styleSuffix}`;

      // Dry run
      if (argv.dryRun) {
        const credits = getPresetCredits('image', { ...argv, model: argv.model || 'flux-dev' });
        console.log(JSON.stringify({
          model,
          prompt,
          credits: credits || 'varies by model',
          style: argv.style || null,
          actor: argv.actor || null,
          seed: argv.seed || null,
        }, null, 2));
        return;
      }

      const token = getToken();
      const api = new MeliesAPI(token);

      const params: Record<string, unknown> = {
        prompt,
        model,
      };
      if (argv.ref) params.refs = [argv.ref];
      if (argv.seed) params.seed = argv.seed;
      if (actorRef) params.imageUrl = actorRef;

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
