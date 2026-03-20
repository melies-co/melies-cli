import type { CommandModule } from 'yargs';
import { MeliesAPI } from '../api';
import { getToken } from '../config';
import { pollAsset } from './image';
import { downloadFile } from '../utils/download';
import { getModelCredits } from '../utils/model-resolver';

interface UpscaleArgs {
  imageUrl: string;
  model?: string;
  scale?: number;
  sync?: boolean;
  dryRun?: boolean;
  output?: string;
}

export const upscaleCommand: CommandModule<{}, UpscaleArgs> = {
  command: 'upscale <imageUrl>',
  describe: 'Upscale an image to higher resolution',
  builder: (yargs) =>
    yargs
      .positional('imageUrl', {
        type: 'string',
        description: 'URL of the image to upscale',
        demandOption: true,
      })
      .option('model', {
        alias: 'm',
        type: 'string',
        default: 'esrgan',
        choices: ['esrgan', 'clarity', 'seedvr2'],
        description: 'Upscaling model to use',
      })
      .option('scale', {
        type: 'number',
        default: 2,
        choices: [2, 4],
        description: 'Scale factor (2x or 4x, 4x costs double)',
      })
      .option('sync', {
        alias: 's',
        type: 'boolean',
        default: false,
        description: 'Wait for completion and return the URL',
      })
      .option('dryRun', {
        alias: 'dry-run',
        type: 'boolean',
        description: 'Show what would happen without generating',
      })
      .option('output', {
        alias: 'o',
        type: 'string',
        description: 'Output file path (use with --sync)',
      }),
  handler: async (argv) => {
    try {
      if (argv.dryRun) {
        const baseCredits = await getModelCredits(argv.model || 'esrgan');
        const credits = baseCredits != null ? baseCredits * (argv.scale === 4 ? 2 : 1) : 'unknown';
        console.log(JSON.stringify({
          model: argv.model,
          scale: argv.scale,
          credits,
          imageUrl: argv.imageUrl,
        }, null, 2));
        return;
      }

      const token = getToken();
      const api = new MeliesAPI(token);

      const result = await api.executeTool('upscale-image', {
        imageUrl: argv.imageUrl,
        model: argv.model,
        scale: argv.scale,
      });

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
          message: 'Upscaling started. Use "melies status <assetId>" to check progress.',
        }, null, 2));
      }
    } catch (error: any) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  },
};
