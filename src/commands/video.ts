import type { CommandModule } from 'yargs';
import { MeliesAPI } from '../api';
import { getToken } from '../config';
import { pollAsset } from './image';
import { resolveModel, getPresetCredits } from '../utils/model-resolver';
import { buildPrompt, type StyleOptions } from '../utils/prompt-builder';
import { findActor } from '../utils/actors';
import { downloadFile } from '../utils/download';
import { addStyleOptions, addQualityOptions, addActorOption, addGenerationOptions } from '../utils/style-options';

interface VideoArgs {
  prompt: string;
  model?: string;
  imageUrl?: string;
  aspectRatio?: string;
  duration?: number;
  resolution?: string;
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

export const videoCommand: CommandModule<{}, VideoArgs> = {
  command: 'video <prompt>',
  describe: 'Generate a video from a text prompt (optionally with a reference image)',
  builder: (yargs) => {
    let y = yargs
      .positional('prompt', {
        type: 'string',
        description: 'Text prompt describing the video',
        demandOption: true,
      })
      .option('model', {
        alias: 'm',
        type: 'string',
        description: 'Video model to use (overrides quality presets)',
      })
      .option('imageUrl', {
        alias: 'i',
        type: 'string',
        description: 'Reference image URL for image-to-video generation',
      })
      .option('aspectRatio', {
        alias: 'a',
        type: 'string',
        default: '16:9',
        description: 'Aspect ratio (16:9, 9:16, 1:1)',
      })
      .option('duration', {
        alias: 'd',
        type: 'number',
        description: 'Video duration in seconds (model-dependent)',
      })
      .option('resolution', {
        alias: 'r',
        type: 'string',
        description: 'Output resolution (model-dependent)',
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
    y = addActorOption(y);
    y = addGenerationOptions(y);
    return y as any;
  },
  handler: async (argv) => {
    try {
      const model = resolveModel('video', argv);

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

      // Build enhanced prompt
      const styleOptions: StyleOptions = {
        camera: argv.camera,
        shot: argv.shot,
        expression: argv.expression,
        lighting: argv.lighting,
        time: argv.time,
        weather: argv.weather,
        colorGrade: argv.colorGrade,
        mood: argv.mood,
        artStyle: argv.artStyle,
        era: argv.era,
      };
      const finalPrompt = buildPrompt(argv.prompt, styleOptions, actorModifier);

      // Dry run
      if (argv.dryRun) {
        const credits = getPresetCredits('video', argv);
        console.log(JSON.stringify({
          model,
          prompt: finalPrompt,
          credits: credits || 'varies by model',
          aspectRatio: argv.aspectRatio,
          duration: argv.duration || null,
          actor: argv.actor || null,
          seed: argv.seed || null,
        }, null, 2));
        return;
      }

      const token = getToken();
      const api = new MeliesAPI(token);

      const params: Record<string, unknown> = {
        prompt: finalPrompt,
        model,
        aspectRatio: argv.aspectRatio,
      };
      if (argv.imageUrl) params.imageUrl = argv.imageUrl;
      if (argv.duration) params.duration = argv.duration;
      if (argv.resolution) params.resolution = argv.resolution;
      if (argv.ref) params.refs = [argv.ref];
      if (argv.seed) params.seed = argv.seed;
      if (actorRef && !argv.imageUrl) params.imageUrl = actorRef;

      const result = await api.executeTool('text_to_video', params);

      if (argv.sync) {
        const asset = await pollAsset(api, result.assetId as string, 300000);
        if (asset.url && argv.output) {
          const filePath = await downloadFile(asset.url, argv.output);
          asset.savedTo = filePath;
        }
        console.log(JSON.stringify(asset, null, 2));
      } else {
        console.log(JSON.stringify({
          assetId: result.assetId,
          status: 'pending',
          message: 'Generation started. Use "melies status <assetId>" to check progress.',
        }, null, 2));
      }
    } catch (error: any) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  },
};
