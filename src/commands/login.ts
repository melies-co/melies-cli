import type { CommandModule } from 'yargs';
import { loadConfig, saveConfig } from '../config';
import * as http from 'http';
import { exec } from 'child_process';

interface LoginArgs {
  token?: string;
}

function openBrowser(url: string): void {
  const platform = process.platform;
  const cmd = platform === 'darwin' ? 'open' :
              platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${cmd} "${url}"`);
}

export const loginCommand: CommandModule<{}, LoginArgs> = {
  command: 'login',
  describe: 'Log in to Melies via browser or with an API token',
  builder: (yargs) =>
    yargs
      .option('token', {
        alias: 't',
        type: 'string',
        description: 'Provide an API token directly (for CI/agents)',
      }),
  handler: async (argv) => {
    try {
      // Direct token mode
      if (argv.token) {
        saveConfig({ token: argv.token });
        console.log(JSON.stringify({ success: true, message: 'Token saved' }));
        return;
      }

      // Browser-based login flow
      const config = loadConfig();
      const baseUrl = config.apiUrl.replace(/\/api$/, '');

      const server = http.createServer();

      // Listen on a random available port
      await new Promise<void>((resolve) => {
        server.listen(0, '127.0.0.1', () => resolve());
      });

      const address = server.address();
      if (!address || typeof address === 'string') {
        console.error(JSON.stringify({ error: 'Failed to start local server' }));
        process.exit(1);
      }

      const port = address.port;
      const authUrl = `${baseUrl}/auth/cli?port=${port}`;

      console.error(`Opening browser for authentication...`);
      console.error(`If the browser doesn't open, visit: ${authUrl}`);
      console.error('');
      console.error(`Waiting for authentication...`);

      openBrowser(authUrl);

      // Wait for the callback with a timeout
      const token = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          server.close();
          reject(new Error('Authentication timed out after 60 seconds. Use "melies login --token <token>" to paste a token manually.'));
        }, 60000);

        server.on('request', (req, res) => {
          const url = new URL(req.url || '/', `http://localhost:${port}`);

          if (url.pathname === '/callback') {
            const callbackToken = url.searchParams.get('token');

            // Send a success page to the browser
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <body style="background:#0a0a0a;color:#a5b4fc;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
                  <div style="text-align:center">
                    <h1 style="font-size:1.5rem;margin-bottom:0.5rem">CLI authenticated</h1>
                    <p style="color:#6b7280">You can close this tab.</p>
                  </div>
                </body>
              </html>
            `);

            clearTimeout(timeout);

            if (callbackToken) {
              resolve(callbackToken);
            } else {
              reject(new Error('No token received from callback'));
            }
          } else {
            res.writeHead(404);
            res.end();
          }
        });
      });

      server.close();

      saveConfig({ token });
      console.log(JSON.stringify({ success: true, message: 'Authenticated successfully' }));
    } catch (error: any) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  },
};
