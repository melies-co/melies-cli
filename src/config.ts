import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.melies');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export interface MeliesConfig {
  token?: string;
  apiUrl: string;
}

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadConfig(): MeliesConfig {
  // Environment variables take precedence
  const envToken = process.env.MELIES_TOKEN;
  const envApiUrl = process.env.MELIES_API_URL;

  let fileConfig: Partial<MeliesConfig> = {};
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    } catch {
      // Ignore parse errors
    }
  }

  return {
    token: envToken || fileConfig.token,
    apiUrl: envApiUrl || fileConfig.apiUrl || 'https://melies.co/api',
  };
}

export function saveConfig(config: Partial<MeliesConfig>): void {
  ensureConfigDir();
  const existing = loadConfig();
  const merged = { ...existing, ...config };
  // Don't save apiUrl if it's the default
  const toSave: Record<string, string> = {};
  if (merged.token) toSave.token = merged.token;
  if (merged.apiUrl && merged.apiUrl !== 'https://melies.co/api') {
    toSave.apiUrl = merged.apiUrl;
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(toSave, null, 2));
}

export function getToken(): string {
  const config = loadConfig();
  if (!config.token) {
    console.error('Not logged in. Run: melies login');
    process.exit(1);
  }
  return config.token;
}
