import type { CommandModule } from 'yargs';
import { MeliesAPI } from '../api';
import { getToken } from '../config';

interface StylesSearchArgs {
  keyword: string;
}

interface StylesInfoArgs {
  code: string;
}

const stylesSearchCommand: CommandModule<{}, StylesSearchArgs> = {
  command: 'search <keyword>',
  describe: 'Search style references by keyword',
  builder: (yargs) =>
    yargs.positional('keyword', {
      type: 'string',
      description: 'Keyword to search (e.g. "cyberpunk", "watercolor")',
      demandOption: true,
    }),
  handler: async (argv) => {
    try {
      const token = getToken();
      const api = new MeliesAPI(token);
      const results = await api.searchSrefStyles(argv.keyword);
      console.log(JSON.stringify(results, null, 2));
    } catch (error: any) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  },
};

const stylesTopCommand: CommandModule = {
  command: 'top',
  describe: 'Show popular style reference keywords',
  handler: async () => {
    try {
      const token = getToken();
      const api = new MeliesAPI(token);
      const results = await api.getTopSrefKeywords();
      console.log(JSON.stringify(results, null, 2));
    } catch (error: any) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  },
};

const stylesInfoCommand: CommandModule<{}, StylesInfoArgs> = {
  command: 'info <code>',
  describe: 'Get details for a specific style reference code',
  builder: (yargs) =>
    yargs.positional('code', {
      type: 'string',
      description: 'Sref code to look up',
      demandOption: true,
    }),
  handler: async (argv) => {
    try {
      const token = getToken();
      const api = new MeliesAPI(token);
      const result = await api.getSrefStyle(argv.code);
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  },
};

export const stylesCommand: CommandModule = {
  command: 'styles',
  describe: 'Browse and search style references (sref codes)',
  builder: (yargs) =>
    yargs
      .command(stylesSearchCommand)
      .command(stylesTopCommand)
      .command(stylesInfoCommand)
      .demandCommand(1, 'Run "melies styles --help" to see subcommands'),
  handler: () => {},
};
