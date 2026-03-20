import type { CommandModule } from 'yargs';
import { getAllActors, searchActors, filterActors } from '../utils/actors';

interface ActorsArgs {
  type?: string;
  gender?: string;
  age?: string;
  json?: boolean;
}

interface ActorsSearchArgs {
  query: string;
  json?: boolean;
}

function printActorTable(actors: { name: string; type: string; gender: string; age: string; tags: string[] }[]) {
  console.log('');
  console.log(`  ${actors.length} actors`);
  console.log('');
  console.log(`  ${'Name'.padEnd(16)} ${'Type'.padEnd(12)} ${'Gender'.padEnd(8)} ${'Age'.padEnd(6)} Tags`);
  console.log('  ' + '─'.repeat(68));

  for (const a of actors) {
    const name = (a.name || '').padEnd(16);
    const type = (a.type || '').padEnd(12);
    const gender = (a.gender || '').padEnd(8);
    const age = (a.age || '').padEnd(6);
    const tags = (a.tags || []).slice(0, 4).join(', ');
    console.log(`  ${name} ${type} ${gender} ${age} ${tags}`);
  }

  console.log('');
}

const actorsSearchCommand: CommandModule<{}, ActorsSearchArgs> = {
  command: 'search <query>',
  describe: 'Search actors by name, tags, or description',
  builder: (yargs) =>
    yargs
      .positional('query', {
        type: 'string',
        description: 'Search query',
        demandOption: true,
      })
      .option('json', {
        type: 'boolean',
        default: false,
        description: 'Output raw JSON (for agents and scripts)',
      }),
  handler: (argv) => {
    const results = searchActors(argv.query);
    const output = results.map((a) => ({
      name: a.name,
      type: a.type,
      gender: a.gender,
      age: a.ageGroup,
      tags: a.tags,
    }));

    if (argv.json) {
      if (results.length === 0) {
        console.log(JSON.stringify({ results: [], message: `No actors found for "${argv.query}"` }));
      } else {
        console.log(JSON.stringify(output, null, 2));
      }
      return;
    }

    if (results.length === 0) {
      console.log(`\n  No actors found for "${argv.query}"\n`);
      return;
    }

    printActorTable(output);
  },
};

export const actorsCommand: CommandModule<{}, ActorsArgs> = {
  command: 'actors',
  describe: 'Browse 148 built-in AI actors',
  builder: (yargs) =>
    yargs
      .command(actorsSearchCommand)
      .option('type', {
        alias: 't',
        type: 'string',
        description: 'Filter by type (Actor, Influencer, Everyday, Character, Senior)',
      })
      .option('gender', {
        alias: 'g',
        type: 'string',
        description: 'Filter by gender (Male, Female)',
      })
      .option('age', {
        type: 'string',
        description: 'Filter by age group (20s, 30s, 40s, 50s, 60s, 70s)',
      })
      .option('json', {
        type: 'boolean',
        default: false,
        description: 'Output raw JSON (for agents and scripts)',
      }),
  handler: (argv) => {
    // If subcommand (search) was used, this handler won't run
    const hasFilters = argv.type || argv.gender || argv.age;
    const results = hasFilters
      ? filterActors({ type: argv.type, gender: argv.gender, age: argv.age })
      : getAllActors();

    const output = results.map((a) => ({
      name: a.name,
      type: a.type,
      gender: a.gender,
      age: a.ageGroup,
      tags: a.tags,
    }));

    if (argv.json) {
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    printActorTable(output);
  },
};
