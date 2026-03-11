import type { CommandModule } from 'yargs';
import { MeliesAPI } from '../api';
import { saveConfig } from '../config';
import * as readline from 'readline';

function prompt(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    if (hidden) {
      // For password input, suppress echo
      const stdin = process.stdin;
      const wasRaw = stdin.isRaw;
      if (stdin.isTTY) {
        stdin.setRawMode(true);
      }

      process.stdout.write(question);
      let input = '';

      const onData = (char: Buffer) => {
        const c = char.toString();
        if (c === '\n' || c === '\r') {
          stdin.removeListener('data', onData);
          if (stdin.isTTY && wasRaw !== undefined) {
            stdin.setRawMode(wasRaw);
          }
          process.stdout.write('\n');
          rl.close();
          resolve(input);
        } else if (c === '\u0003') {
          // Ctrl+C
          process.exit(0);
        } else if (c === '\u007F' || c === '\b') {
          // Backspace
          if (input.length > 0) {
            input = input.slice(0, -1);
          }
        } else {
          input += c;
        }
      };

      stdin.on('data', onData);
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });
}

interface LoginArgs {
  email?: string;
  password?: string;
  token?: string;
}

export const loginCommand: CommandModule<{}, LoginArgs> = {
  command: 'login',
  describe: 'Log in to Melies and store your auth token',
  builder: (yargs) =>
    yargs
      .option('email', {
        alias: 'e',
        type: 'string',
        description: 'Your Melies email',
      })
      .option('password', {
        alias: 'p',
        type: 'string',
        description: 'Your Melies password',
      })
      .option('token', {
        alias: 't',
        type: 'string',
        description: 'Provide a JWT token directly (skip email/password)',
      }),
  handler: async (argv) => {
    try {
      // Direct token mode
      if (argv.token) {
        saveConfig({ token: argv.token });
        console.log(JSON.stringify({ success: true, message: 'Token saved' }));
        return;
      }

      // Interactive login
      const email = argv.email || await prompt('Email: ');
      const password = argv.password || await prompt('Password: ', true);

      if (!email || !password) {
        console.error(JSON.stringify({ error: 'Email and password are required' }));
        process.exit(1);
      }

      const api = new MeliesAPI();
      const result = await api.login(email, password);

      if (result.token) {
        saveConfig({ token: result.token });
        console.log(JSON.stringify({
          success: true,
          user: result.user.name || result.user.email,
          plan: result.user.accountIds?.[0]?.plan || 'free',
        }));
      } else {
        console.error(JSON.stringify({ error: 'Login failed. Check your credentials.' }));
        process.exit(1);
      }
    } catch (error: any) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  },
};
