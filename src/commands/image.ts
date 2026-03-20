import type { CommandModule } from 'yargs';
import { MeliesAPI } from '../api';
import { getToken } from '../config';
import { resolveModel, getModelCredits } from '../utils/model-resolver';
import type { StyleOptions } from '../utils/prompt-builder';
import { findActor } from '../utils/actors';
import { downloadFile, getOutputPath } from '../utils/download';
import { addStyleOptions, addQualityOptions, addActorOption, addGenerationOptions } from '../utils/style-options';

interface ImageArgs {
  prompt: string;
  model?: string;
  aspectRatio?: string;
  numOutputs?: number;
  resolution?: string;
  imageUrl?: string;
  ref?: string;
  sref?: string;
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

export const imageCommand: CommandModule<{}, ImageArgs> = {
  command: 'image <prompt>',
  describe: 'Generate an image from a text prompt',
  builder: (yargs) => {
    let y = yargs
      .positional('prompt', {
        type: 'string',
        description: 'Text prompt describing the image',
        demandOption: true,
      })
      .option('model', {
        alias: 'm',
        type: 'string',
        description: 'Image model to use (overrides quality presets)',
      })
      .option('aspectRatio', {
        alias: 'a',
        type: 'string',
        default: '1:1',
        description: 'Aspect ratio (1:1, 16:9, 9:16, 4:3, 3:4)',
      })
      .option('numOutputs', {
        alias: 'n',
        type: 'number',
        default: 1,
        description: 'Number of images to generate (1-4)',
      })
      .option('resolution', {
        alias: 'r',
        type: 'string',
        description: 'Output resolution (model-dependent)',
      })
      .option('imageUrl', {
        alias: 'i',
        type: 'string',
        description: 'Reference image URL for image-to-image generation',
      })
      .option('ref', {
        type: 'string',
        description: 'Reference ID (actor/object) for consistent characters',
      })
      .option('sref', {
        type: 'string',
        description: 'Style reference code for visual style consistency',
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

      // Prepend actor modifier to prompt
      const rawPrompt = actorModifier ? `${actorModifier}, ${argv.prompt}` : argv.prompt;

      // Dry run
      if (argv.dryRun) {
        const credits = await getModelCredits(model);
        console.log(JSON.stringify({
          model,
          prompt: rawPrompt,
          styleOptions: Object.keys(styleOptions).length > 0 ? styleOptions : undefined,
          credits: credits ?? 'unknown',
          aspectRatio: argv.aspectRatio,
          numOutputs: argv.numOutputs,
          actor: argv.actor || null,
          sref: argv.sref || null,
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
        numOutputs: argv.numOutputs,
      };
      if (Object.keys(styleOptions).length > 0) params.styleOptions = styleOptions;
      if (argv.resolution) params.resolution = argv.resolution;
      if (argv.imageUrl) params.imageUrl = argv.imageUrl;
      if (argv.seed) params.seed = argv.seed;

      // References: actor image URL or user ref ID
      const refs: string[] = [];
      if (argv.ref) refs.push(argv.ref);
      if (actorRef) params.imageUrl = params.imageUrl || actorRef;
      if (refs.length > 0) params.refs = refs;

      // Style reference
      if (argv.sref) {
        const srefData = await api.getSrefStyle(argv.sref);
        if (srefData?.imageUrl) {
          params.srefImageUrl = srefData.imageUrl;
        }
      }

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
          message: 'Generation started. Use "melies status <assetId>" to check progress.',
        }, null, 2));
      }
    } catch (error: any) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  },
};

export async function pollAsset(api: MeliesAPI, assetId: string, maxWait = 120000): Promise<any> {
  const start = Date.now();
  const interval = 3000;

  while (Date.now() - start < maxWait) {
    const { assets } = await api.getAssets({ limit: 50 });
    const asset = assets.find((a) => a._id === assetId);

    if (asset) {
      if (asset.status === 'completed') {
        return {
          assetId: asset._id,
          status: 'completed',
          url: asset.url,
          type: asset.type,
          prompt: asset.prompt,
          model: asset.model,
        };
      }
      if (asset.status === 'failed') {
        return {
          assetId: asset._id,
          status: 'failed',
          error: asset.error || 'Generation failed',
        };
      }
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  return {
    assetId,
    status: 'timeout',
    message: `Generation did not complete within ${maxWait / 1000}s. Check with "melies status ${assetId}".`,
  };
}
