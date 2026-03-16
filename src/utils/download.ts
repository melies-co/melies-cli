import * as fs from 'fs';
import * as path from 'path';

export async function downloadFile(url: string, outputPath: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}

export function getOutputPath(url: string, outputArg?: string, outputDir?: string): string | null {
  if (!outputArg && !outputDir) return null;

  if (outputArg) return path.resolve(outputArg);

  // Auto-name from URL
  const urlPath = new URL(url).pathname;
  const ext = path.extname(urlPath) || '.webp';
  const name = `melies-${Date.now()}${ext}`;
  return path.resolve(outputDir || '.', name);
}
