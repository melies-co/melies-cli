import type { CommandModule } from 'yargs';
import { MeliesAPI } from '../api';
import { getToken } from '../config';

interface AssetsArgs {
  limit?: number;
  offset?: number;
  type?: string;
}

export const assetsCommand: CommandModule<{}, AssetsArgs> = {
  command: 'assets',
  describe: 'List your generated assets (images, videos)',
  builder: (yargs) =>
    yargs
      .option('limit', {
        alias: 'l',
        type: 'number',
        default: 20,
        description: 'Number of assets to return',
      })
      .option('offset', {
        alias: 'o',
        type: 'number',
        default: 0,
        description: 'Offset for pagination',
      })
      .option('type', {
        alias: 't',
        type: 'string',
        choices: ['text_to_image', 'text_to_video', 'poster_generator', 'image_to_image'],
        description: 'Filter by tool type',
      }),
  handler: async (argv) => {
    try {
      const token = getToken();
      const api = new MeliesAPI(token);

      const { assets } = await api.getAssets({
        limit: argv.limit,
        offset: argv.offset,
        toolId: argv.type,
      });

      const output = assets.map((a) => ({
        id: a._id,
        name: a.name,
        type: a.type,
        toolId: a.toolId || null,
        status: a.status,
        url: a.url || null,
        model: a.model || null,
        createdAt: a.createdAt,
      }));

      console.log(JSON.stringify({ assets: output }, null, 2));
    } catch (error: any) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  },
};
