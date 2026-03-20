import type { CommandModule } from 'yargs';
import { MeliesAPI } from '../api';
import { getToken } from '../config';

interface CreditsArgs {
  granularity?: string;
  json?: boolean;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatCredits(n: number): string {
  return n.toLocaleString('en-US');
}

function barChart(value: number, max: number, width: number = 20): string {
  if (max === 0) return '';
  const filled = Math.round((value / max) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

export const creditsCommand: CommandModule<{}, CreditsArgs> = {
  command: 'credits',
  describe: 'Check credit balance and usage stats',
  builder: (yargs) =>
    yargs
      .option('granularity', {
        alias: 'g',
        type: 'string',
        choices: ['day', 'week', 'month'],
        default: 'month',
        description: 'Granularity for usage stats',
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

      const { user } = await api.getUser();
      const account = user.accountIds?.[0];

      const { stats } = await api.getCreditStats(argv.granularity);

      const plan = account?.plan || 'free';
      const credits = account?.credits ?? 0;

      if (argv.json) {
        console.log(JSON.stringify({ plan, credits, usage: stats }, null, 2));
        return;
      }

      // Human-readable output
      console.log('');
      console.log(`  Plan:     ${plan}`);
      console.log(`  Credits:  ${formatCredits(credits)}`);
      console.log('');

      if (stats && stats.length > 0) {
        const max = Math.max(...stats.map((s: any) => s.totalCredits));

        console.log('  Usage');
        console.log('  ' + '─'.repeat(50));

        for (const s of stats) {
          const id = s._id;
          let label: string;

          if (id.day) {
            label = `${MONTHS[id.month - 1]} ${String(id.day).padStart(2, ' ')}`;
          } else if (id.week) {
            label = `${MONTHS[id.month - 1]} W${id.week}`;
          } else {
            label = `${MONTHS[id.month - 1]} ${id.year}`;
          }

          const bar = barChart(s.totalCredits, max);
          const credits = formatCredits(s.totalCredits);
          console.log(`  ${label.padEnd(10)} ${bar} ${credits.padStart(7)}`);
        }

        console.log('  ' + '─'.repeat(50));
        const total = stats.reduce((sum: number, s: any) => sum + s.totalCredits, 0);
        console.log(`  ${'Total'.padEnd(10)} ${' '.repeat(20)} ${formatCredits(total).padStart(7)}`);
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
