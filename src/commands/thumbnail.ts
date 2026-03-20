import type { CommandModule } from 'yargs';
import { MeliesAPI } from '../api';
import { getToken } from '../config';
import { pollAsset } from './image';
import { resolveModel, getModelCredits } from '../utils/model-resolver';
import type { StyleOptions } from '../utils/prompt-builder';
import { findActor } from '../utils/actors';
import { downloadFile } from '../utils/download';
import { addStyleOptions, addQualityOptions, addActorOption, addGenerationOptions } from '../utils/style-options';

interface ThumbnailArgs {
  prompt: string;
  model?: string;
  numOutputs?: number;
  ref?: string;
  sync?: boolean;
  actor?: string;
  fast?: boolean;
  quality?: boolean;
  best?: boolean;
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
  dryRun?: boolean;
  seed?: number;
  output?: string;
}

export const thumbnailCommand: CommandModule<{}, ThumbnailArgs> = {
  command: 'thumbnail <prompt>',
  describe: 'Generate YouTube thumbnails (16:9, optimized for click-through)',
  builder: (yargs) => {
    let y = yargs
      .positional('prompt', {
        type: 'string',
        description: 'Text prompt describing the thumbnail',
        demandOption: true,
      })
      .option('model', {
        alias: 'm',
        type: 'string',
        description: 'Image model to use (overrides quality presets)',
      })
      .option('numOutputs', {
        alias: 'n',
        type: 'number',
        default: 1,
        description: 'Number of thumbnails to generate (1-4)',
      })
      .option('ref', {
        type: 'string',
        description: 'Reference ID for consistent characters',
      })
      .option('sync', {
        alias: 's',
        type: 'boolean',
        default: false,
        description: 'Wait for generation to complete and return the URL',
      });
    y = addStyleOptions(y);
    y = addQualityOptions(y);
    y = addActorOption(y);
    y = addGenerationOptions(y);
    return y as any;
  },
  handler: async (argv) => {
    try {
      const model = resolveModel('image', argv);

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

      // Collect style options (resolved server-side)
      const styleOptions: StyleOptions = {};
      styleOptions.expression = argv.expression || 'smile';
      styleOptions.lighting = argv.lighting || 'soft';
      if (argv.camera) styleOptions.camera = argv.camera;
      if (argv.shot) styleOptions.shot = argv.shot;
      if (argv.time) styleOptions.time = argv.time;
      if (argv.weather) styleOptions.weather = argv.weather;
      if (argv.colorGrade) styleOptions.colorGrade = argv.colorGrade;
      if (argv.mood) styleOptions.mood = argv.mood;
      if (argv.artStyle) styleOptions.artStyle = argv.artStyle;
      if (argv.era) styleOptions.era = argv.era;

      const rawPrompt = actorModifier
        ? `${actorModifier}, YouTube thumbnail: ${argv.prompt}, bold vibrant colors, high contrast, eye-catching composition`
        : `YouTube thumbnail: ${argv.prompt}, bold vibrant colors, high contrast, eye-catching composition`;

      if (argv.dryRun) {
        const credits = await getModelCredits(model);
        console.log(JSON.stringify({
          model,
          prompt: rawPrompt,
          styleOptions,
          credits: credits ?? 'unknown',
          aspectRatio: '16:9',
          numOutputs: argv.numOutputs,
          actor: argv.actor || null,
          seed: argv.seed || null,
        }, null, 2));
        return;
      }

      const token = getToken();
      const api = new MeliesAPI(token);

      const params: Record<string, unknown> = {
        prompt: rawPrompt,
        model,
        aspectRatio: '16:9',
        numOutputs: argv.numOutputs,
        styleOptions,
      };
      if (argv.ref) params.refs = [argv.ref];
      if (argv.seed) params.seed = argv.seed;
      if (actorRef) params.imageUrl = actorRef;

      const result = await api.executeTool('text_to_image', params);

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
          message: 'Thumbnail generation started. Use "melies status <assetId>" to check progress.',
        }, null, 2));
      }
    } catch (error: any) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  },
};
