import type { CommandModule } from 'yargs';
import { MeliesAPI } from '../api';
import { getToken } from '../config';

interface ImageArgs {
  prompt: string;
  model?: string;
  aspectRatio?: string;
  numOutputs?: number;
  resolution?: string;
  imageUrl?: string;
  ref?: string;
  sync?: boolean;
}

export const imageCommand: CommandModule<{}, ImageArgs> = {
  command: 'image <prompt>',
  describe: 'Generate an image from a text prompt',
  builder: (yargs) =>
    yargs
      .positional('prompt', {
        type: 'string',
        description: 'Text prompt describing the image',
        demandOption: true,
      })
      .option('model', {
        alias: 'm',
        type: 'string',
        default: 'flux-schnell',
        description: 'Image model to use (run "melies models" to see all)',
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
        description: 'Reference ID (actor/object) to use for consistent characters',
      })
      .option('sync', {
        alias: 's',
        type: 'boolean',
        default: false,
        description: 'Wait for generation to complete and return the URL',
      }),
  handler: async (argv) => {
    try {
      const token = getToken();
      const api = new MeliesAPI(token);

      const params: Record<string, unknown> = {
        prompt: argv.prompt,
        model: argv.model,
        aspectRatio: argv.aspectRatio,
        numOutputs: argv.numOutputs,
      };
      if (argv.resolution) params.resolution = argv.resolution;
      if (argv.imageUrl) params.imageUrl = argv.imageUrl;
      if (argv.ref) params.refs = [argv.ref];

      const result = await api.executeTool('text_to_image', params);

      if (argv.sync) {
        const asset = await pollAsset(api, result.assetId as string);
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
