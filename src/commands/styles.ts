import type { CommandModule } from 'yargs';

interface StylesArgs {
  type?: string;
  json?: boolean;
}

const STYLE_CATEGORIES: Record<string, { flag: string; values: string[] }> = {
  'art-style': {
    flag: '--art-style',
    values: ['film-still', 'blockbuster', 'noir', 'anime', 'ghibli', 'oil', 'watercolor', 'concept', 'comic', 'pixel', 'photorealistic', 'surreal', 'pop-art', 'sketch', 'ukiyo-e', 'art-deco', 'neo-noir'],
  },
  'lighting': {
    flag: '--lighting',
    values: ['soft', 'golden', 'noir', 'rembrandt', 'backlit', 'neon', 'candle', 'hard', 'high-key', 'low-key', 'natural', 'studio', 'silhouette'],
  },
  'camera': {
    flag: '--camera',
    values: ['eye-level', 'high', 'low', 'overhead', 'dutch', 'ots', 'profile', 'three-quarter', 'worms-eye', 'birds-eye'],
  },
  'shot': {
    flag: '--shot',
    values: ['ecu', 'close-up', 'medium', 'cowboy', 'full-body', 'wide', 'tighter', 'wider'],
  },
  'expression': {
    flag: '--expression',
    values: ['smile', 'laugh', 'serious', 'surprised', 'villain-smirk', 'seductive', 'horrified', 'pensive', 'angry', 'sad', 'confident', 'shy', 'neutral', 'dreamy', 'intense', 'mischievous', 'stoic', 'exhausted', 'ecstatic', 'disgusted', 'fearful', 'proud', 'curious', 'bored', 'determined'],
  },
  'mood': {
    flag: '--mood',
    values: ['romantic', 'mysterious', 'tense', 'ethereal', 'gritty', 'epic', 'nostalgic', 'serene', 'chaotic', 'melancholic', 'triumphant'],
  },
  'color-grade': {
    flag: '--color-grade',
    values: ['natural', 'teal-orange', 'mono', 'warm', 'cool', 'filmic', 'sepia', 'bleach-bypass', 'cross-process', 'vintage'],
  },
  'era': {
    flag: '--era',
    values: ['victorian', '1920s', '1950s', '1980s', 'modern', 'dystopian', 'medieval', 'renaissance', 'art-nouveau', 'cyberpunk', 'steampunk'],
  },
  'time': {
    flag: '--time',
    values: ['dawn', 'sunrise', 'golden', 'midday', 'afternoon', 'dusk', 'twilight', 'night', 'blue-hour'],
  },
  'weather': {
    flag: '--weather',
    values: ['clear', 'fog', 'rain', 'storm', 'snow', 'overcast', 'mist', 'haze'],
  },
  'composition': {
    flag: '--composition',
    values: ['rule-of-thirds', 'symmetric', 'leading-lines', 'frame-within-frame', 'diagonal', 'golden-ratio', 'centered', 'off-center'],
  },
  'dof': {
    flag: '--dof',
    values: ['very-shallow', 'shallow', 'moderate', 'deep', 'tilt-shift'],
  },
  'focal-length': {
    flag: '--focal-length',
    values: ['14mm', '24mm', '35mm', '50mm', '85mm', '135mm', '200mm', '400mm'],
  },
  'aperture': {
    flag: '--aperture',
    values: ['f1.2', 'f1.4', 'f1.8', 'f2.8', 'f4', 'f5.6', 'f8', 'f11', 'f16', 'f22'],
  },
  'lens': {
    flag: '--lens',
    values: ['anamorphic', 'tilt-shift', 'macro', 'fish-eye', 'pinhole', 'soft-focus'],
  },
  'exposure': {
    flag: '--exposure',
    values: ['crushed', 'underexposed', 'normal', 'overexposed', 'blown-out'],
  },
  'camera-model': {
    flag: '--camera-model',
    values: ['arri-alexa', 'red-v-raptor', 'sony-venice', 'super-8', 'iphone', 'polaroid', 'hasselblad'],
  },
  'movement': {
    flag: '--movement',
    values: ['dolly-in', 'dolly-out', 'pan-left', 'pan-right', 'tilt-up', 'tilt-down', 'orbit-360', 'crane-up', 'crane-down', 'slow-zoom-in', 'slow-zoom-out', 'handheld', 'static', 'fpv-drone', 'steadicam'],
  },
};

function searchStyles(query: string): { category: string; flag: string; value: string }[] {
  const q = query.toLowerCase();
  const results: { category: string; flag: string; value: string }[] = [];

  for (const [category, data] of Object.entries(STYLE_CATEGORIES)) {
    if (category.includes(q)) {
      for (const v of data.values) {
        results.push({ category, flag: data.flag, value: v });
      }
    } else {
      for (const v of data.values) {
        if (v.includes(q)) {
          results.push({ category, flag: data.flag, value: v });
        }
      }
    }
  }

  return results;
}

const stylesSearchCommand: CommandModule<{}, { keyword: string; json?: boolean }> = {
  command: 'search <keyword>',
  describe: 'Search styles by keyword',
  builder: (yargs) =>
    yargs
      .positional('keyword', {
        type: 'string',
        description: 'Keyword to search (e.g. "neon", "noir", "golden")',
        demandOption: true,
      })
      .option('json', {
        type: 'boolean',
        default: false,
        description: 'Output raw JSON',
      }),
  handler: (argv) => {
    const results = searchStyles(argv.keyword);

    if (argv.json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    if (results.length === 0) {
      console.log(`\n  No styles found for "${argv.keyword}"\n`);
      return;
    }

    console.log('');
    console.log(`  ${results.length} styles matching "${argv.keyword}"`);
    console.log('');
    console.log(`  ${'Flag'.padEnd(22)} ${'Value'.padEnd(20)} Category`);
    console.log('  ' + '─'.repeat(56));

    for (const r of results) {
      console.log(`  ${r.flag.padEnd(22)} ${r.value.padEnd(20)} ${r.category}`);
    }

    console.log('');
  },
};

export const stylesCommand: CommandModule<{}, StylesArgs> = {
  command: 'styles',
  describe: 'Browse 220+ visual styles, lighting, camera angles, and more',
  builder: (yargs) =>
    yargs
      .command(stylesSearchCommand)
      .option('type', {
        alias: 't',
        type: 'string',
        choices: Object.keys(STYLE_CATEGORIES),
        description: 'Show values for a specific style category',
      })
      .option('json', {
        type: 'boolean',
        default: false,
        description: 'Output raw JSON (for agents and scripts)',
      }),
  handler: (argv) => {
    if (argv.json) {
      if (argv.type) {
        const cat = STYLE_CATEGORIES[argv.type];
        console.log(JSON.stringify({ flag: cat.flag, values: cat.values }, null, 2));
      } else {
        console.log(JSON.stringify(STYLE_CATEGORIES, null, 2));
      }
      return;
    }

    if (argv.type) {
      const cat = STYLE_CATEGORIES[argv.type];
      console.log('');
      console.log(`  ${argv.type} (${cat.flag})`);
      console.log('  ' + '─'.repeat(40));
      for (const v of cat.values) {
        console.log(`  ${v}`);
      }
      console.log('');
      console.log(`  Usage: melies image "prompt" ${cat.flag} ${cat.values[0]} --sync`);
      console.log('');
      return;
    }

    // Show all categories overview
    console.log('');
    console.log('  Visual Style Flags');
    console.log('  ' + '─'.repeat(60));

    let totalValues = 0;
    for (const [category, data] of Object.entries(STYLE_CATEGORIES)) {
      totalValues += data.values.length;
      const preview = data.values.slice(0, 5).join(', ');
      const more = data.values.length > 5 ? `, +${data.values.length - 5} more` : '';
      console.log(`  ${data.flag.padEnd(22)} ${preview}${more}`);
    }

    console.log('  ' + '─'.repeat(60));
    console.log(`  ${totalValues} values across ${Object.keys(STYLE_CATEGORIES).length} categories`);
    console.log('');
    console.log('  Show a category:  melies styles --type lighting');
    console.log('  Search styles:    melies styles search "neon"');
    console.log('  Browse online:    https://melies.co/docs/styles');
    console.log('');
  },
};
