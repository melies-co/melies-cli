import type { CommandModule } from 'yargs';
import { MeliesAPI } from '../api';

interface ModelsArgs {
  type?: string;
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

      console.log(JSON.stringify(output, null, 2));
    } catch (error: any) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  },
};
