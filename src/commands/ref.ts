import type { CommandModule } from 'yargs';
import { MeliesAPI } from '../api';
import { getToken } from '../config';

interface RefListArgs {}

interface RefCreateArgs {
  label: string;
  imageUrl: string;
  type?: string;
}

interface RefDeleteArgs {
  id: string;
}

const refListCommand: CommandModule<{}, RefListArgs> = {
  command: 'list',
  describe: 'List your saved references (actors, objects)',
  handler: async () => {
    try {
      const token = getToken();
      const api = new MeliesAPI(token);
      const { references } = await api.getReferences();

      const output = references.map((r: any) => ({
        id: r._id,
        label: r.label,
        type: r.type,
        status: r.status,
        thumbnailUrl: r.thumbnailUrl || null,
        fullUrl: r.fullUrl || null,
      }));

      console.log(JSON.stringify(output, null, 2));
    } catch (error: any) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  },
};

const refCreateCommand: CommandModule<{}, RefCreateArgs> = {
  command: 'create <label>',
  describe: 'Create a reference (actor/object) from an image URL',
  builder: (yargs) =>
    yargs
      .positional('label', {
        type: 'string',
        description: 'Name for this reference (e.g. "John", "Red Chair")',
        demandOption: true,
      })
      .option('imageUrl', {
        alias: 'i',
        type: 'string',
        description: 'Public image URL of the actor or object',
        demandOption: true,
      })
      .option('type', {
        alias: 't',
        type: 'string',
        choices: ['actor', 'object'],
        default: 'actor',
        description: 'Reference type',
      }),
  handler: async (argv) => {
    try {
      const token = getToken();
      const api = new MeliesAPI(token);

      const result = await api.generateReference(
        [argv.imageUrl],
        argv.label,
        argv.type || 'actor'
      );

      console.log(JSON.stringify({
        referenceId: result.referenceId,
        status: 'generating',
        message: 'Reference is being generated. Use "melies ref list" to check when ready.',
      }, null, 2));
    } catch (error: any) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  },
};

const refDeleteCommand: CommandModule<{}, RefDeleteArgs> = {
  command: 'delete <id>',
  describe: 'Delete a reference',
  builder: (yargs) =>
    yargs.positional('id', {
      type: 'string',
      description: 'Reference ID to delete',
      demandOption: true,
    }),
  handler: async (argv) => {
    try {
      const token = getToken();
      const api = new MeliesAPI(token);
      await api.deleteReference(argv.id);
      console.log(JSON.stringify({ success: true, message: 'Reference deleted' }));
    } catch (error: any) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  },
};

export const refCommand: CommandModule = {
  command: 'ref',
  describe: 'Manage AI actor and object references for consistent characters',
  builder: (yargs) =>
    yargs
      .command(refListCommand)
      .command(refCreateCommand)
      .command(refDeleteCommand)
      .demandCommand(1, 'Run "melies ref --help" to see subcommands'),
  handler: () => {},
};
