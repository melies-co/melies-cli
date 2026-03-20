import type { CommandModule } from 'yargs';
import { MeliesAPI } from '../api';
import { getToken } from '../config';
import { pollAsset } from './image';
import { downloadFile } from '../utils/download';
import { getModelCredits } from '../utils/model-resolver';

interface RemoveBgArgs {
  imageUrl: string;
  sync?: boolean;
  dryRun?: boolean;
  output?: string;
}

export const removeBgCommand: CommandModule<{}, RemoveBgArgs> = {
  command: 'remove-bg <imageUrl>',
  describe: 'Remove the background from an image',
  builder: (yargs) =>
    yargs
      .positional('imageUrl', {
        type: 'string',
        description: 'URL of the image to process',
        demandOption: true,
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
        const credits = await getModelCredits('remove-background');
        console.log(JSON.stringify({
          tool: 'remove-background',
          credits: credits ?? 'unknown',
          imageUrl: argv.imageUrl,
        }, null, 2));
        return;
      }

      const token = getToken();
      const api = new MeliesAPI(token);

      const result = await api.executeTool('remove-background', {
        imageUrl: argv.imageUrl,
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
          message: 'Background removal started. Use "melies status <assetId>" to check progress.',
        }, null, 2));
      }
    } catch (error: any) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  },
};
