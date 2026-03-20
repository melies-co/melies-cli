import type { CommandModule } from 'yargs';
import { MeliesAPI } from '../api';

interface ModelsArgs {
  type?: string;
  json?: boolean;
}

export const modelsCommand: CommandModule<{}, ModelsArgs> = {
  command: 'models',
  describe: 'List available AI models (no auth needed)',
  builder: (yargs) =>
    yargs
      .option('type', {
        alias: 't',
        type: 'string',
        choices: ['image', 'video', 'sound', 'sound_effect'],
        description: 'Filter by model type',
      })
      .option('json', {
        type: 'boolean',
        default: false,
        description: 'Output raw JSON (for agents and scripts)',
      }),
  handler: async (argv) => {
    try {
      const api = new MeliesAPI();
      const { models } = await api.getModels();

      let filtered = models;
      if (argv.type) {
        filtered = models.filter((m: any) => m.type === argv.type);
      }

      const output = filtered.map((m: any) => ({
        id: m.id || m.model,
        name: m.name,
        type: m.type,
        credits: m.credits ?? null,
      }));

      if (argv.json) {
        console.log(JSON.stringify(output, null, 2));
        return;
      }

      // Human-readable table
      console.log('');
      console.log(`  ${filtered.length} models available${argv.type ? ` (${argv.type})` : ''}`);
      console.log('');
      console.log(`  ${'ID'.padEnd(24)} ${'Name'.padEnd(28)} ${'Type'.padEnd(8)} Credits`);
      console.log('  ' + '─'.repeat(72));

      for (const m of output) {
        const id = (m.id || '').padEnd(24);
        const name = (m.name || '').slice(0, 27).padEnd(28);
        const type = (m.type || '').padEnd(8);
        const credits = m.credits != null ? String(m.credits) : '—';
        console.log(`  ${id} ${name} ${type} ${credits}`);
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
