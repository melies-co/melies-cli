import type { CommandModule } from 'yargs';
import { MeliesAPI } from '../api';
import { getToken } from '../config';

interface CreditsArgs {
  granularity?: string;
}

export const creditsCommand: CommandModule<{}, CreditsArgs> = {
  command: 'credits',
  describe: 'Check credit balance and usage stats',
  builder: (yargs) =>
    yargs.option('granularity', {
      alias: 'g',
      type: 'string',
      choices: ['day', 'week', 'month'],
      default: 'month',
      description: 'Granularity for usage stats',
    }),
  handler: async (argv) => {
    try {
      const token = getToken();
      const api = new MeliesAPI(token);

      // Get user info for current balance
      const { user } = await api.getUser();
      const account = user.accountIds?.[0];

      // Get usage stats
      const { stats } = await api.getCreditStats(argv.granularity);

      console.log(JSON.stringify({
        plan: account?.plan || 'free',
        credits: account?.credits ?? 0,
        usage: stats,
      }, null, 2));
    } catch (error: any) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  },
};
