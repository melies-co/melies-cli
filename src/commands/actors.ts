import type { CommandModule } from 'yargs';
import { getAllActors, searchActors, filterActors } from '../utils/actors';

interface ActorsArgs {
  type?: string;
  gender?: string;
  age?: string;
}

interface ActorsSearchArgs {
  query: string;
}

const actorsSearchCommand: CommandModule<{}, ActorsSearchArgs> = {
  command: 'search <query>',
  describe: 'Search actors by name, tags, or description',
  builder: (yargs) =>
    yargs.positional('query', {
      type: 'string',
      description: 'Search query',
      demandOption: true,
    }),
  handler: (argv) => {
    const results = searchActors(argv.query);
    if (results.length === 0) {
      console.log(JSON.stringify({ results: [], message: `No actors found for "${argv.query}"` }));
      return;
    }
    const output = results.map((a) => ({
      name: a.name,
      type: a.type,
      gender: a.gender,
      age: a.ageGroup,
      tags: a.tags,
    }));
    console.log(JSON.stringify(output, null, 2));
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
    console.log(JSON.stringify(output, null, 2));
  },
};
