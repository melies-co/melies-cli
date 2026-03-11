import type { CommandModule } from 'yargs';
import { MeliesAPI } from '../api';
import { getToken } from '../config';
import { pollAsset } from './image';

interface VideoArgs {
  prompt: string;
  model?: string;
  imageUrl?: string;
  aspectRatio?: string;
  duration?: number;
  resolution?: string;
  ref?: string;
  sync?: boolean;
}

export const videoCommand: CommandModule<{}, VideoArgs> = {
  command: 'video <prompt>',
  describe: 'Generate a video from a text prompt (optionally with a reference image)',
  builder: (yargs) =>
    yargs
      .positional('prompt', {
        type: 'string',
        description: 'Text prompt describing the video',
        demandOption: true,
      })
      .option('model', {
        alias: 'm',
        type: 'string',
        default: 'kling-v2',
        description: 'Video model to use (run "melies models -t video" to see all)',
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
      };
      if (argv.imageUrl) params.imageUrl = argv.imageUrl;
      if (argv.duration) params.duration = argv.duration;
      if (argv.resolution) params.resolution = argv.resolution;
      if (argv.ref) params.refs = [argv.ref];

      const result = await api.executeTool('text_to_video', params);

      if (argv.sync) {
        const asset = await pollAsset(api, result.assetId as string, 300000); // 5 min for video
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
