import type { CommandModule } from 'yargs';
import { MeliesAPI } from '../api';
import { getToken } from '../config';

interface StatusArgs {
  assetId: string;
}

export const statusCommand: CommandModule<{}, StatusArgs> = {
  command: 'status <assetId>',
  describe: 'Check the status of a generation job',
  builder: (yargs) =>
    yargs.positional('assetId', {
      type: 'string',
      description: 'Asset ID returned from a generation command',
      demandOption: true,
    }),
  handler: async (argv) => {
    try {
      const token = getToken();
      const api = new MeliesAPI(token);

      const { assets } = await api.getAssets({ limit: 100 });
      const asset = assets.find((a) => a._id === argv.assetId);

      if (!asset) {
        console.error(JSON.stringify({ error: `Asset ${argv.assetId} not found in recent assets` }));
        process.exit(1);
      }

      console.log(JSON.stringify({
        assetId: asset._id,
        status: asset.status,
        type: asset.type,
        url: asset.url || null,
        prompt: asset.prompt,
        model: asset.model,
        error: asset.error || null,
        createdAt: asset.createdAt,
      }, null, 2));
    } catch (error: any) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  },
};
