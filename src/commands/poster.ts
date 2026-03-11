import type { CommandModule } from 'yargs';
import { MeliesAPI } from '../api';
import { getToken } from '../config';
import { pollAsset } from './image';

interface PosterArgs {
  title: string;
  logline?: string;
  genre?: string;
  model?: string;
  ref?: string;
  sync?: boolean;
}

export const posterCommand: CommandModule<{}, PosterArgs> = {
  command: 'poster <title>',
  describe: 'Generate a movie poster from a title, logline, and genre',
  builder: (yargs) =>
    yargs
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
      .option('model', {
        alias: 'm',
        type: 'string',
        description: 'Image model to use for poster generation',
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
        prompt: `Movie poster for "${argv.title}"${argv.logline ? `. ${argv.logline}` : ''}${argv.genre ? `. Genre: ${argv.genre}` : ''}`,
        model: argv.model || 'flux-dev',
      };
      if (argv.ref) params.refs = [argv.ref];

      const result = await api.executeTool('poster_generator', params);

      if (argv.sync) {
        const asset = await pollAsset(api, result.assetId as string);
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
