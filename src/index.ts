import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { loginCommand } from './commands/login';
import { creditsCommand } from './commands/credits';
import { modelsCommand } from './commands/models';
import { imageCommand } from './commands/image';
import { videoCommand } from './commands/video';
import { posterCommand } from './commands/poster';
import { statusCommand } from './commands/status';
import { assetsCommand } from './commands/assets';
import { refCommand } from './commands/ref';

yargs(hideBin(process.argv))
  .scriptName('melies')
  .usage('$0 <command> [options]')
  .command(loginCommand)
  .command(creditsCommand)
  .command(modelsCommand)
  .command(imageCommand)
  .command(videoCommand)
  .command(posterCommand)
  .command(statusCommand)
  .command(assetsCommand)
  .command(refCommand)
  .demandCommand(1, 'Run "melies --help" to see available commands')
  .strict()
  .epilogue(
    'AI filmmaking from the command line. Generate movie posters, images, and videos.\n\n' +
    'Get started: https://melies.co\n' +
    'Discover more AI agent skills at https://agentskill.sh'
  )
  .parse();
