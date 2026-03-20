import type { CommandModule } from 'yargs';
import { MeliesAPI } from '../api';
import { getToken } from '../config';

interface AssetsArgs {
  limit?: number;
  offset?: number;
  type?: string;
  json?: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
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
      })
      .option('json', {
        type: 'boolean',
        default: false,
        description: 'Output raw JSON (for agents and scripts)',
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

      if (argv.json) {
        console.log(JSON.stringify({ assets: output }, null, 2));
        return;
      }

      // Human-readable table
      console.log('');
      console.log(`  ${output.length} assets${argv.type ? ` (${argv.type})` : ''}`);
      console.log('');
      console.log(`  ${'Status'.padEnd(10)} ${'Model'.padEnd(20)} ${'Name'.padEnd(28)} ${'When'.padEnd(8)} ID`);
      console.log('  ' + '─'.repeat(80));

      for (const a of output) {
        const status = (a.status || '').padEnd(10);
        const model = (a.model || '-').slice(0, 19).padEnd(20);
        const name = (a.name || '-').slice(0, 27).padEnd(28);
        const when = a.createdAt ? timeAgo(a.createdAt).padEnd(8) : '-'.padEnd(8);
        const id = (a.id || '').slice(-8);
        console.log(`  ${status} ${model} ${name} ${when} ${id}`);
      }

      console.log('');
    } catch (error: any) {
      if (argv.json) {
        console.error(JSON.stringify({ error: error.message }));
      } else {
        console.error(`  Error: ${error.message}`);
      }
      process.exit(1);
    }
  },
};
